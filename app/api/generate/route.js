import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with the Service Role Key for Admin rights
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
const supabase = createClient(supabaseUrl, supabaseKey)

const MODAL_WEBHOOK_URL = process.env.MODAL_WEBHOOK_URL

export async function POST(request) {
  try {
    const body = await request.json()
    const { prompt, userId } = body

    if (!prompt || !userId) {
      return NextResponse.json({ error: 'Missing prompt or userId' }, { status: 400 })
    }

    if (!MODAL_WEBHOOK_URL) {
      console.error("Missing MODAL_WEBHOOK_URL environment variable.")
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 1. Insert the job into Supabase. 
    // Because we set up SQL triggers, this automatically checks and deducts a user credit.
    const { data: jobData, error: dbError } = await supabase
      .from('generation_jobs')
      .insert([{ user_id: userId, prompt: prompt }])
      .select()
      .single()

    if (dbError) {
      console.error("Database Insert Error:", dbError)
      return NextResponse.json({ error: 'Failed to create job or out of credits' }, { status: 403 })
    }

    // 2. Fire and Forget to the Modal GPU Webhook
    // We do NOT await this fetch because 3D generation takes several seconds.
    // Modal runs asynchronously and updates Supabase directly when it finishes.
    fetch(MODAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobData.id,
        prompt: prompt,
        user_id: userId
      })
    }).catch(err => console.error("Modal trigger failed:", err))

    // 3. Return the jobId to the frontend instantly so it can start the Realtime listener
    return NextResponse.json({ jobId: jobData.id })

  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
