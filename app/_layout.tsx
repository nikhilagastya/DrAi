import React, { useEffect } from 'react'
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
  const { user, userRole, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === 'auth'

    if (!user && !inAuthGroup) {
      // User is not authenticated and not in auth group, redirect to auth
      router.replace('/auth')
    } else if (user && userRole && inAuthGroup) {
      // User is authenticated and in auth group, redirect to appropriate dashboard
      switch (userRole.role) {
        case 'patient':
          router.replace('/patient')
          break
        case 'field_doctor':
          router.replace('/doctor')
          break
        case 'admin':
          router.replace('/admin')
          break
        default:
          router.replace('/auth')
      }
    }
  }, [user, userRole, loading, segments])

  if (loading) {
    return <Loader></Loader>
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

