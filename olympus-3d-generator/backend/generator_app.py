import os
import time
from datetime import datetime
import modal
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env for local development
load_dotenv()

# 1. Define the expected incoming JSON payload from Next.js
class GenerationRequest(BaseModel):
    job_id: str
    prompt: str
    user_id: str

# 2. Build the heavy container environment with upgraded libraries
image = (
    modal.Image.debian_slim(python_version="3.11")  # Upgraded to 3.11 for better performance
    .apt_install("git", "libgl1-mesa-glx", "libglib2.0-0", "libsm6", "libxext6", "libxrender-dev")
    .pip_install(
        "torch==2.5.1", 
        "torchvision==0.20.1",
        "transformers>=4.46.0",
        "diffusers>=0.32.0",
        "accelerate>=1.1.0",
        "supabase>=2.9.0",
        "trimesh[easy]>=4.5.0",
        "postgrest>=0.17.0",
        "imageio>=2.36.0",
        "rembg>=2.0.60",
        "pydantic>=2.10.0",
        "python-dotenv>=1.0.1"
    )
    # Specialized 3D / attention libraries
    .run_commands("pip install flash-attn --no-build-isolation")
    .run_commands("pip install spconv-cu121")
    .run_commands("pip install git+https://github.com/microsoft/TRELLIS.git")
)

app = modal.App("olympus-3d-engine")

# 3. Cache model weights during deployment
@app.build()
def download_ai_weights():
    import torch
    from diffusers import AutoPipelineForText2Image
    from trellis.pipelines import TrellisImageTo3DPipeline
    import rembg
    
    print("Caching SDXL-Turbo (Text-to-Image)...")
    AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sdxl-turbo", 
        torch_dtype=torch.float16, 
        variant="fp16"
    )
    
    print("Caching background removal model...")
    rembg.new_session("u2net")
    
    print("Caching TRELLIS (Image-to-3D)...")
    TrellisImageTo3DPipeline.from_pretrained("JeffreyXiang/TRELLIS-image-large")

# 4. The actual AI pipeline
def run_ai_mesh_generation(prompt: str, local_path: str):
    import torch
    from diffusers import AutoPipelineForText2Image
    from trellis.pipelines import TrellisImageTo3DPipeline
    from trellis.utils import postprocessing_utils
    import rembg

    print(f"[AI] Step 1: Generating 2D concept for '{prompt}'...")
    t2i_pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sdxl-turbo", 
        torch_dtype=torch.float16, 
        variant="fp16"
    ).to("cuda")
    
    concept_image = t2i_pipe(prompt, num_inference_steps=4, guidance_scale=0.0).images[0]
    
    # Clear VRAM
    del t2i_pipe
    torch.cuda.empty_cache()

    print("[AI] Step 2: Removing background...")
    no_bg_image = rembg.remove(concept_image)

    print("[AI] Step 3: TRELLIS Image-to-3D...")
    trellis_pipe = TrellisImageTo3DPipeline.from_pretrained("JeffreyXiang/TRELLIS-image-large")
    trellis_pipe.cuda()
    
    outputs = trellis_pipe.run(no_bg_image, seed=42)
    
    print("[AI] Step 4: Exporting GLB...")
    glb_mesh = postprocessing_utils.to_glb(
        outputs['gaussian'][0],
        outputs['mesh'][0],
        simplify=0.95,
        texture_size=1024
    )
    
    glb_mesh.export(local_path)

# 5. Secure FastAPI Endpoint
@app.function(
    image=image,
    gpu="A10G",
    timeout=300,
    secrets=[modal.Secret.from_name("supabase-olympus-env")]
)
@modal.fastapi_endpoint(method="POST")
def generate_3d_asset(req: GenerationRequest):
    from supabase import create_client, Client
    import trimesh
    
    job_id = req.job_id
    prompt = req.prompt
    user_id = req.user_id
    
    supabase_url = "https://zomqfdywrajfpphehyzi.supabase.co"
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    bucket_name = "olympus-models"
    
    if not supabase_key:
        raise ValueError("Critical Error: SUPABASE_SERVICE_ROLE_KEY is missing.")

    supabase: Client = create_client(supabase_url, supabase_key)
    
    raw_path = f"/tmp/{job_id}_raw.glb"
    compressed_path = f"/tmp/{job_id}_compressed.glb"
    storage_path = f"{user_id}/{job_id}.glb"
    
    try:
        supabase.table("generation_jobs").update({"status": "processing"}).eq("id", job_id).execute()
        
        run_ai_mesh_generation(prompt, raw_path)
        
        print("[Modal Worker] Compressing with Draco...")
        mesh = trimesh.load(raw_path, force='mesh')
        mesh.export(compressed_path, file_type='glb', draco_compression=True)
        
        print("[Modal Worker] Uploading to Supabase Storage...")
        with open(compressed_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                file=f,
                path=storage_path,
                file_options={"content-type": "model/gltf-binary"}
            )
            
        output_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
        
        supabase.table("generation_jobs").update({
            "status": "complete",
            "output_url": output_url,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()
        
        return {"status": "success", "url": output_url}
        
    except Exception as e:
        print(f"[Modal Worker] Error: {str(e)}")
        supabase.table("generation_jobs").update({"status": "failed"}).eq("id", job_id).execute()
        return {"status": "failed", "error": str(e)}

@app.local_entrypoint()
def main():
    print("Ready for deployment. Run `npm run backend:deploy`")
