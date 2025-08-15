import React, { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'

export default function DoctorLayout() {
  const { user, userRole, loading } = useAuth()

  // console.log('Doctor layout - auth state:', { 
  //   hasUser: !!user, 
  //   role: userRole?.role, 
  //   loading 
  // })

  // Only redirect if auth is fully loaded and user is not a doctor
  useEffect(() => {
    if (!loading) {
      if (!user || !userRole) {
        console.log('No user or role in doctor layout, redirecting to auth')
        router.replace('/auth')
      } else if (userRole.role !== 'field_doctor') {
        console.log('User is not a doctor, redirecting based on role:', userRole.role)
        switch (userRole.role) {
          case 'patient':
            router.replace('/patient')
            break
          case 'admin':
            router.replace('/admin')
            break
          default:
            router.replace('/auth')
        }
      }
    }
  }, [user, userRole, loading])

  // Show nothing while loading or while redirecting
  if (loading || !user || !userRole || userRole.role !== 'field_doctor') {
    return null
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patient-search"
        options={{
          title: 'Find Patients',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="visit-form"
        options={{
          title: 'New Visit',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat-room"
        options={{
          title: 'AI Diagnosis',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="psychology" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="edit-visit"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  )
}