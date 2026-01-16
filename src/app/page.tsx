'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function TestPage() {
  const [connected, setConnected] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // Remove await - createClient is synchronous
        const supabase = createClient()
        const { data, error } = await supabase.from('users').select('*').limit(1)
        
        if (error) {
          setError(error.message)
          setConnected(false)
        } else {
          setError(null)
          setConnected(true)
        }
        
        console.log('data', data)
        console.log('error', error)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setConnected(false)
        console.log('error', err)
      }
    }
    void testConnection()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Supabase Connection Test</h1>
      {connected && !error ? (
        <p style={{ color: 'green' }}>✓ Connected to Supabase!</p>
      ) : error ? (
        <p style={{ color: 'red' }}>✗ Error: {error}</p>
      ) : (
        <p>Testing connection...</p>
      )}
    </div>
  )
}