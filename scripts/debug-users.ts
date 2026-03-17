import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 })
  console.log('error:', error)
  console.log('users:', data?.users?.map(u => ({ email: u.email, id: u.id })))
}

main()
