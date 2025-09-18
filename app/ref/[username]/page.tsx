import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default async function ReferralPage({ params }: { params: { username: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const username = params.username.toLowerCase()
  const { data, error } = await supabase
    .from('affiliates')
    .select('id, is_verified')
    .eq('username', username)
    .single()

  if (!data || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Referral Link Not Found</h1>
          <p className="text-gray-700 dark:text-gray-200">This referral link does not exist. Please check the link or contact support.</p>
        </div>
      </div>
    )
  }

  if (!data.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">Referral Link Not Yet Verified</h1>
          <p className="text-gray-700 dark:text-gray-200">This referral link is not yet verified. Please contact the owner of the link or check back later.</p>
        </div>
      </div>
    )
  }

  // Set referral cookie and redirect
  cookies().set('referral', username, { path: '/', maxAge: 60 * 60 * 24 * 30 })
  redirect('/')
} 