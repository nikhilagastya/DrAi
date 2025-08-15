import React, { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Provider as PaperProvider } from 'react-native-paper'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import Loader from '~/components/Loader'

// Custom theme for React Native Paper
const theme = {
  colors: {
    primary: '#2196F3',
    accent: '#4CAF50',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    disabled: '#cccccc',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
}

function RootLayoutNav() {
  const { user, userRole, loading: authLoading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    // Don't navigate while auth is still loading
    if (authLoading) {
      console.log('Auth is loading, waiting...')
      return
    }

    const inAuthGroup = segments[0] === 'auth'
    const inPatientGroup = segments[0] === 'patient'
    const inDoctorGroup = segments[0] === 'doctor'
    const inAdminGroup = segments[0] === 'admin'
    
    console.log('Navigation check:', { 
      user: !!user, 
      userRole: userRole?.role, 
      segments,
      inAuthGroup,
      currentPath: segments.join('/') 
    })

    const navigate = async () => {
      setIsNavigating(true)
      
      try {
        if (!user) {
          // No user - redirect to auth if not already there
          if (!inAuthGroup) {
            console.log('No user, redirecting to auth')
            router.replace('/auth')
          }
        } else if (user && userRole?.role) {
          // User exists with role - redirect to appropriate dashboard if not already there
          console.log('User logged in with role:', userRole.role)
          
          switch (userRole.role) {
            case 'patient':
              if (!inPatientGroup) {
                console.log('Redirecting to patient dashboard')
                router.replace('/patient')
              }
              break
            case 'field_doctor':
              if (!inDoctorGroup) {
                console.log('Redirecting to doctor dashboard')
                router.replace('/doctor')
              }
              break
            case 'admin':
              if (!inAdminGroup) {
                console.log('Redirecting to admin dashboard')
                router.replace('/admin')
              }
              break
            default:
              console.log('Unknown role, redirecting to auth')
              router.replace('/auth')
          }
        } else if (user && !userRole) {
          // User exists but no role found - redirect to auth
          console.log('User exists but no role found, redirecting to auth')
          router.replace('/auth')
        }
      } catch (error) {
        console.error('Navigation error:', error)
      } finally {
        setIsNavigating(false)
      }
    }

    // Add a small delay to avoid race conditions, but make it shorter
    const timer = setTimeout(navigate, 50)
    return () => clearTimeout(timer)
  }, [user, userRole, authLoading, segments])

  // Show loader while auth is loading or while navigating
  if (authLoading || isNavigating) {
    return <Loader isOpen={true} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="patient" options={{ headerShown: false }} />
      <Stack.Screen name="doctor" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </PaperProvider>
  )
}