import React from 'react'
import { Stack } from 'expo-router'
import { Provider as PaperProvider } from 'react-native-paper'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import Loader from '~/components/Loader'
import Toast from 'react-native-toast-message'
import { toastConfig } from '~/utils/toast'

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
  const { loading } = useAuth()

 
  // if (loading) {
  //   return <Loader isOpen={true} />
  // }

  return (
    <>
   
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="patient" options={{ headerShown: false }} />
      <Stack.Screen name="doctor" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>

    <Toast config={toastConfig} />
    </>
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