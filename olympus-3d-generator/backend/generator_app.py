import os
import time
from datetime import datetime
import modal

# 1. Define the remote OS environment and libraries
image = modal.Image.debian_slim().pip_install(
    "supabase==2.3.0",
    "trimesh[easy]==4.0.5",
    "postgrest==0.16.0"
)

# Initialize the Modal application instance
app = modal.App("olympus-3d-engine")

# 2. Mock generation step (To be replaced with Trellis/Hunyuan3D weights)
def run_ai_mesh_generation(prompt: str, local_path: str):
    import trimesh
    print(f"[Modal Worker] Computing 3D geometry for: '{prompt}'...")
    time.sleep(5)  # Simulate GPU model execution time
    
    # Generate the initial base geometry
    mesh = trimesh.creation.box()
    mesh.export(local_path)

# 3. Create the function that runs exclusively on Modal's remote GPUs
@app.function(
    image=image,
    gpu="A10G",  # Requests an enterprise Nvidia A10G GPU for fast operations
    timeout=300,  # 5 minute hard limit timeout safety switch
    secrets=[modal.Secret.from_name("supabase-olympus-env")] # Safely inject keys
)
def generate_3d_asset(job_id: str, prompt: str, user_id: str):
    from supabase import create_client, Client
    import trimesh
    
    # Read environment variables injected securely by Modal
    supabase_url = "https://zomqfdywrajfpphehyzi.supabase.co"
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    bucket_name = "olympus-models"
    
    if not supabase_key:
        raise ValueError("Critical Error: SUPABASE_SERVICE_ROLE_KEY is missing from environment.")

    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Internal worker file paths
    raw_path = f"/tmp/{job_id}_raw.glb"
    compressed_path = f"/tmp/{job_id}_compressed.glb"
    storage_path = f"{user_id}/{job_id}.glb"
    
    try:
        # Mark job state as processing inside your Supabase table
        supabase.table("generation_jobs").update({"status": "processing"}).eq("id", job_id).execute()
        
        # Execute model execution
        run_ai_mesh_generation(prompt, raw_path)
        
        # Compress the mesh geometry via Draco
        print("[Modal Worker] Compressing mesh with Draco compression...")
        mesh = trimesh.load(raw_path, force='mesh')
        mesh.export(compressed_output_path=compressed_path, file_type='glb', draco_compression=True)
        
        # Stream file to Supabase storage buckets
        print("[Modal Worker] Uploading optimized asset to Supabase Storage...")
        with open(compressed_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                file=f,
                path=storage_path,
                file_options={"content-type": "model/gltf-binary"}
            )
            
        # Extract the public URL path
        output_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
        
        # Record successful completion payload
        supabase.table("generation_jobs").update({
            "status": "complete",
            "output_url": output_url,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()
        
        return {"status": "success", "url": output_url}
        
    except Exception as e:
        print(f"[Modal Worker] Fatal task processing crash: {str(e)}")
        supabase.table("generation_jobs").update({"status": "failed"}).eq("id", job_id).execute()
        return {"status": "failed", "error": str(e)}

# 4. Local entryway execution pipeline test block
@app.local_entrypoint()
def main():
    print("Triggering test generation job remotely on Modal platform...")
    # Mocking arguments for a test run execution
    test_job_id = "test-uuid-12345"
    test_prompt = "A high-fidelity low-poly crystal sword"
    test_user_id = "user-test-67890"
    
    result = generate_3d_asset.remote(test_job_id, test_prompt, test_user_id)
    print("Execution complete. Worker response output:", result)
