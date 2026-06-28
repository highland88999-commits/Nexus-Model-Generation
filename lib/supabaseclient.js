import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zomqfdywrajfpphehyzi.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_jOnP6Zog2jduWebdkn34cg_HWmj-tOW'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
