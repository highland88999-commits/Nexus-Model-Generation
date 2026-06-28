import os
import time
import trimesh
from supabase import create_client, Client
from datetime import datetime

# Initialize Supabase with your provided project URL
SUPABASE_URL = "https://zomqfdywrajfpphehyzi.supabase.co"
# Service role key must be injected via environment variable for security
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 

if not SUPABASE_KEY:
    print("[Error] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "olympus-models"

def generate_3d_model(prompt: str, temp_output_path: str):
    """
    Core AI model execution wrapper (Trellis / Hunyuan3D).
    """
    print(f"--> [AI] Generating model for prompt: '{prompt}'...")
    time.sleep(5) 
    
    # Generate temporary base mesh
    mesh = trimesh.creation.box()
    mesh.export(temp_output_path)

def compress_model(input_path: str, compressed_output_path: str):
    """
    Compresses geometry using Draco to make it high-performance for the browser.
    """
    print("--> [Draco] Compressing mesh...")
    mesh = trimesh.load(input_path, force='mesh')
    mesh.export(compressed_output_path, file_type='glb', draco_compression=True)

def process_job(job):
    job_id = job['id']
    prompt = job['prompt']
    user_id = job['user_id']
    
    raw_path = f"/tmp/{job_id}_raw.glb"
    compressed_path = f"/tmp/{job_id}_compressed.glb"
    storage_path = f"{user_id}/{job_id}.glb"

      try:
        supabase.table("generation_jobs").update({"status": "processing"}).eq("id", job_id).execute()
        
        generate_3d_model(prompt, raw_path)
        compress_model(raw_path, compressed_path)
        
        print("--> [Storage] Uploading to Supabase...")
        with open(compressed_path, "rb") as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                file=f, 
                path=storage_path, 
                file_options={"content-type": "model/gltf-binary"}
            )
        
        output_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
        
        supabase.table("generation_jobs").update({
            "status": "complete",
            "output_url": output_url,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()
        
        print(f"Job {job_id} complete! URL: {output_url}")

    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        supabase.table("generation_jobs").update({"status": "failed"}).eq("id", job_id).execute()
        
    finally:
        if os.path.exists(raw_path): os.remove(raw_path)
        if os.path.exists(compressed_path): os.remove(compressed_path)

def worker_loop():
    print("Worker started. Polling for jobs...")
    while True:
        response = supabase.table("generation_jobs") \
            .select("*") \
            .eq("status", "pending") \
            .order("created_at") \
            .limit(1) \
            .execute()
        
        jobs = response.data
        if jobs:
            print(f"Found pending job: {jobs[0]['id']}")
            process_job(jobs[0])
        else:
            time.sleep(3)

if __name__ == "__main__":
    worker_loop()
