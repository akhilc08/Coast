// app/(admin)/admin/settings/page.tsx
// NOTE: No 'use server' at file level — this is a Server Component page,
// not a server actions module. The inline action has its own 'use server'.
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function saveMarkup(formData: FormData) {
  'use server'
  const raw = formData.get('markup_pct')
  const pct = parseInt(String(raw), 10)
  if (Number.isNaN(pct) || pct < 0 || pct > 100) return

  const supabase = createAdminClient()
  await supabase
    .from('app_settings')
    .upsert({ key: 'transport_markup_pct', value: String(pct) })

  revalidatePath('/admin/settings')
}

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'transport_markup_pct')
    .single()

  const currentMarkup = data?.value ?? '0'

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#1c1917]">Settings</h1>

      <div className="rounded-xl border border-[#e7e5e4] bg-white p-6 max-w-md">
        <h2 className="mb-1 text-base font-semibold text-[#1c1917]">Transport Settings</h2>
        <p className="mb-4 text-sm text-[#78716c]">
          Markup applied to all transport quotes shown to buyers.
        </p>

        <form action={saveMarkup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#78716c]">
              Transport Markup (%)
            </label>
            <input
              type="number"
              name="markup_pct"
              min={0}
              max={100}
              defaultValue={currentMarkup}
              className="w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-sm text-[#1c1917] focus:border-blue-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-[#a8a29e]">
              0 = pass-through. 15 = add 15% to every quote.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
