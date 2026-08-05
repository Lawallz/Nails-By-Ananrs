import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqglfeyjkmkrndqsatfr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ2xmZXlqa21rcm5kcXNhdGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzIyNDAsImV4cCI6MjEwMTQ0ODI0MH0.FVORgEqOBT878auHPbaew4IYBSthLvLGzB0N4MbnV7I'

export const supabase = createClient(supabaseUrl, supabaseKey)