import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ModelGenerator({ userId }) {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('idle') // idle, pending, processing, complete, failed
  const [modelUrl, setModelUrl] = useState(null)
  const [jobId, setJobId] = useState(null)

  // Realtime Listener for the specific Job
  useEffect(() => {
    if (!jobId) return

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const newStatus = payload.new.status
          setStatus(newStatus)
          
          if (newStatus === 'complete') {
            setModelUrl(payload.new.output_url)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId])

  const handleGenerate = async () => {
    if (!prompt) return

    setStatus('pending')
    
    // Insert the job into Supabase
    const { data, error } = await supabase
      .from('generation_jobs')
      .insert([
        { 
          user_id: userId, 
          prompt: prompt 
        }
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating job:", error)
      setStatus('failed')
      return
    }

    // Set the jobId to trigger the Realtime listener
    setJobId(data.id)
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white max-w-md">
      <h2 className="text-xl font-bold mb-4">Forge New Asset</h2>
      
      <input
        type="text"
        className="w-full p-2 mb-4 text-black rounded"
        placeholder="Enter your prompt (e.g., A low poly sword)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={status === 'pending' || status === 'processing'}
      />
      
      <button
        onClick={handleGenerate}
        disabled={status === 'pending' || status === 'processing'}
        className="w-full bg-blue-600 hover:bg-blue-500 p-2 rounded font-bold disabled:opacity-50"
      >
        {status === 'idle' ? 'Generate 3D Model' : `Status: ${status}...`}
      </button>

      {modelUrl && (
        <div className="mt-4 p-2 bg-green-800 rounded">
          <p>Generation Complete!</p>
          <a href={modelUrl} target="_blank" rel="noreferrer" className="text-blue-300 underline">
            Download GLB File
          </a>
        </div>
      )}
    </div>
  )
}
