import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getUserRole, UserRole, Patient, FieldDoctor, Admin, getPatientProfile, getDoctorProfile, getAdminProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  userRole: UserRole | null
  userProfile: Patient | FieldDoctor | Admin | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userProfile, setUserProfile] = useState<Patient | FieldDoctor | Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserData(session.user.id)
        } else {
          setUserRole(null)
          setUserProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (userId: string) => {
    try {
      setLoading(true)
      
      // Get user role
      const role = await getUserRole(userId)
      setUserRole(role)

      if (role) {
        // Get user profile based on role
        let profile = null
        switch (role.role) {
          case 'patient':
            profile = await getPatientProfile(userId)
            break
          case 'field_doctor':
            profile = await getDoctorProfile(userId)
            break
          case 'admin':
            profile = await getAdminProfile(userId)
            break
        }
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error || !data.user) {
      return { error }
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        auth_user_id: data.user.id,
        role: userData.role,
      })

    if (roleError) {
      return { error: roleError }
    }

    // Create profile based on role
    let profileError = null
    switch (userData.role) {
      case 'patient':
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            auth_user_id: data.user.id,
            name: userData.name,
            age: userData.age,
            gender: userData.gender,
            phone: userData.phone,
            email: email,
            address: userData.address,
            emergency_contact_name: userData.emergencyContactName,
            emergency_contact_phone: userData.emergencyContactPhone,
            medical_history: userData.medicalHistory,
            allergies: userData.allergies,
            current_medications: userData.currentMedications,
          })
        profileError = patientError
        break

      case 'field_doctor':
        const { error: doctorError } = await supabase
          .from('field_doctors')
          .insert({
            auth_user_id: data.user.id,
            name: userData.name,
            specialization: userData.specialization,
            license_number: userData.licenseNumber,
            phone: userData.phone,
            email: email,
            years_of_experience: userData.yearsOfExperience,
          })
        profileError = doctorError
        break

      case 'admin':
        const { error: adminError } = await supabase
          .from('admins')
          .insert({
            auth_user_id: data.user.id,
            name: userData.name,
            phone: userData.phone,
            email: email,
            permissions: userData.permissions || [],
          })
        profileError = adminError
        break
    }

    return { error: profileError }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id)
    }
  }

  const value: AuthContextType = {
    user,
    userRole,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

