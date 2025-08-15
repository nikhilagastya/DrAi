import { useEffect } from 'react'
import { router } from 'expo-router'

export default function AuthIndex() {




  useEffect(() => {
    // Redirect to role selection as the default auth screen
    router.push('/auth/role-selection')
  }, [])

  return null
}

