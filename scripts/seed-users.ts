import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const users = [
  { email: 'admin@drivewithcoast.com', password: 'AdminPass123!', role: 'admin', full_name: 'Coast Admin' },
  { email: 'buyer@example.com', password: 'BuyerPass123!', role: 'consumer', full_name: 'Example Buyer' },
  { email: 'seller@example.com', password: 'SellerPass123!', role: 'wholesaler', full_name: 'Example Dealer' },
]

async function setProfileRole(userId: string, role: string, extra?: Record<string, string>) {
  const { error } = await supabase
    .from('profiles')
    .update({ role, ...extra })
    .eq('id', userId)
  if (error) console.error(`  ⚠️  profile update:`, error.message)
  else console.log(`  ↳ profile role → ${role}`)
}

async function main() {
  const { data: { users: existing } } = await supabase.auth.admin.listUsers({ perPage: 100 })

  for (const u of users) {
    const found = existing?.find(x => x.email === u.email)

    if (found) {
      console.log(`🔄 ${u.email} exists — updating profile`)
      await setProfileRole(
        found.id,
        u.role,
        u.role === 'wholesaler' ? { company: 'Example Auto Group', phone: '(555) 000-1234' } : undefined
      )
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        app_metadata: { role: u.role },
        user_metadata: { full_name: u.full_name },
      })
      if (error) {
        console.error(`❌ ${u.email}:`, error.message)
      } else {
        console.log(`✅ ${u.email} (${u.role}) — ${data.user.id}`)
        await setProfileRole(
          data.user.id,
          u.role,
          u.role === 'wholesaler' ? { company: 'Example Auto Group', phone: '(555) 000-1234' } : undefined
        )
      }
    }
  }
}

main()
