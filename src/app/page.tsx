'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      
      if (!user) {
        router.push('/signin')
      }
    }
    checkUser()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome!</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-lg mb-2">You're signed in as:</p>
          <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
    </div>
  )
}
