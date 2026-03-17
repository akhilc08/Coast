'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWholesalerSchema, type CreateWholesalerInput } from '@/lib/validations/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.app_metadata?.role !== 'admin') throw new Error('Not authorized')
  return user
}

export async function createWholesalerAction(
  data: CreateWholesalerInput
): Promise<{ success: true; userId: string } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const result = createWholesalerSchema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? 'Invalid input'
    return { error: firstError }
  }

  const { email, password, businessName } = result.data
  const admin = createAdminClient()

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'wholesaler' },
    user_metadata: { company: businessName },
  })

  if (error || !newUser.user) {
    return { error: error?.message ?? 'Failed to create user' }
  }

  // Backfill company into profiles (trigger only copies full_name)
  await admin.from('profiles').update({ company: businessName }).eq('id', newUser.user.id)

  return { success: true, userId: newUser.user.id }
}

export async function banUserAction(
  userId: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function unbanUserAction(
  userId: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })

  if (error) return { error: error.message }
  return { success: true }
}
