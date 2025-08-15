import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Custom storage implementation using Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key)
  },
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database types
export interface Patient {
  id: string
  auth_user_id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_history?: string
  allergies?: string
  current_medications?: string
  created_at: string
  updated_at: string
}

export interface FieldDoctor {
  id: string
  auth_user_id: string
  name: string
  specialization?: string
  license_number?: string
  phone?: string
  email?: string
  years_of_experience?: number
  created_at: string
  updated_at: string
}

export interface Admin {
  id: string
  auth_user_id: string
  name: string
  phone?: string
  email?: string
  permissions?: string[]
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  patient_id: string
  doctor_id: string
  visit_date: string
  weight?: number
  height?: number
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature?: number
  blood_sugar?: number
  oxygen_saturation?: number
  respiratory_rate?: number
  symptoms?: string
  diagnosis?: string
  treatment_notes?: string
  prescribed_medications?: string
  follow_up_instructions?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  patient_id: string;
  session_id:string;
  role: 'user' | 'ai'
  message: string
  context_visits?: string[]
  timestamp: string
}

export interface UserRole {
  id: string
  auth_user_id: string
  role: 'patient' | 'field_doctor' | 'admin'
  created_at: string
}

// Helper functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('auth_user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user role:', error)
    return null
  }
  
  return data
}

export const getPatientProfile = async (userId: string): Promise<Patient | null> => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('auth_user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching patient profile:', error)
    return null
  }
  
  return data
}

export const getDoctorProfile = async (userId: string): Promise<FieldDoctor | null> => {
  const { data, error } = await supabase
    .from('field_doctors')
    .select('*')
    .eq('auth_user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching doctor profile:', error)
    return null
  }
  
  return data
}

export const getAdminProfile = async (userId: string): Promise<Admin | null> => {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('auth_user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching admin profile:', error)
    return null
  }
  
  return data
}

