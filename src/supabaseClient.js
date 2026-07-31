import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://cnzikqndzordynfsjfdj.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuemlrcW5kem9yZHluZnNqZmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjIyNjgsImV4cCI6MjEwMTA5ODI2OH0.2nT4txv0PnUf3jF30543G9jMZuLtTPZkvbTsUFFskGs'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const APP_VERSION = '1.0.0'
