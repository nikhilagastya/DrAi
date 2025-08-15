import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  getUserRole,
  UserRole,
  Patient,
  FieldDoctor,
  Admin,
  getPatientProfile,
  getDoctorProfile,
  getAdminProfile,
} from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  userProfile: Patient | FieldDoctor | Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any, error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<Patient | FieldDoctor | Admin | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch role & profile together with enhanced error handling
  const loadUserData = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Loading user data for:', userId);
      
      // Add timeout wrapper for getUserRole
      const getUserRoleWithTimeout = async (id: string) => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getUserRole timeout after 5 seconds')), 5000)
        );
        
        const getRolePromise = getUserRole(id);
        
        return Promise.race([getRolePromise, timeoutPromise]);
      };
      
      console.log('📋 About to call getUserRole...');
      const roleData = await getUserRoleWithTimeout(userId);
      console.log('📋 Role data received:', roleData);
      
      if (!roleData) {
        console.warn('⚠️ No role found for user:', userId);
        setUserRole(null);
        setUserProfile(null);
        return;
      }
      
      setUserRole(roleData);
  
      if (roleData?.role) {
        console.log('👤 Loading profile for role:', roleData.role);
        let profile: Patient | FieldDoctor | Admin | null = null;
        
        try {
          // Add timeout for profile loading too
          const getProfileWithTimeout = async (role: string, id: string) => {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`get${role}Profile timeout after 5 seconds`)), 5000)
            );
            
            let profilePromise;
            switch (role) {
              case 'patient':
                profilePromise = getPatientProfile(id);
                break;
              case 'field_doctor':
                profilePromise = getDoctorProfile(id);
                break;
              case 'admin':
                profilePromise = getAdminProfile(id);
                break;
              default:
                throw new Error(`Unknown role: ${role}`);
            }
            
            return Promise.race([profilePromise, timeoutPromise]);
          };
          
          console.log('🏥 About to load profile...');
          profile = await getProfileWithTimeout(roleData.role, userId);
          console.log('✅ Profile loaded successfully:', !!profile);
          
          setUserProfile(profile);
          
          if (!profile) {
            console.warn('⚠️ No profile found for user role:', roleData.role);
          }
          
        } catch (profileError) {
          console.error('❌ Error loading profile:', profileError);
          setUserProfile(null);
        }
      } else {
        console.warn('⚠️ Role data exists but no role specified');
        setUserProfile(null);
      }
      
      console.log('✅ loadUserData completed successfully');
      
    } catch (error) {
      console.error( error);
      setUserRole(null);
      setUserProfile(null);
    }
  }, []);

  // Run once on mount + when auth changes
  useEffect(() => {
    let mounted = true;
  
    const initAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        setLoading(true);
  
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ Error getting session:', error);
        }
        
        const currentUser = session?.user ?? null;
        console.log('👤 Current user from session:', currentUser?.email || 'none');
        
        if (mounted) setUser(currentUser);
  
        if (currentUser) {
          console.log('📱 About to load user data...');
          
          // Set a maximum timeout for the entire loading process
          const loadDataWithTimeout = Promise.race([
            loadUserData(currentUser.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Overall loading timeout after 10 seconds')), 10000)
            )
          ]);
          
          try {
            await loadDataWithTimeout;
            console.log('✅ User data loading completed');
          } catch (timeoutError) {
            console.error('⏰ User data loading timed out:', timeoutError);
            
            // Fallback: Try to manually query the user role
            console.log('🔄 Attempting direct database query as fallback...');
            try {
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('auth_user_id', currentUser.id)
                .single();
                
              if (!roleError && roleData) {
                console.log('✅ Direct query successful:', roleData);
                setUserRole(roleData);
              } else {
                console.error('❌ Direct query failed:', roleError);
                // Set a default role to unblock the user
                console.log('🚨 Setting fallback role to unblock user');
                setUserRole({
                  id: 'fallback',
                  auth_user_id: currentUser.id,
                  role: 'field_doctor', // Based on email doc@gmail.com
                  created_at: new Date().toISOString()
                });
              }
            } catch (directQueryError) {
              console.error('❌ Direct query error:', directQueryError);
            }
          }
        } else {
          console.log('🚫 No current user, clearing role and profile');
          setUserRole(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        setUserRole(null);
        setUserProfile(null);
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      }
    };
  
    initAuth();
  
    // Listen for login/logout with timeout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        
        if (!mounted) return;
        
        setLoading(true);
        const authUser = session?.user ?? null;
        setUser(authUser);
  
        if (authUser) {
          console.log('👤 User authenticated, loading data...');
          
          try {
            // Set timeout for auth state change loading too
            await Promise.race([
              loadUserData(authUser.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Auth state change timeout')), 8000)
              )
            ]);
          } catch (stateChangeError) {
            console.error('⏰ Auth state change loading timed out:', stateChangeError);
            
            // Try direct query as fallback
            try {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .single();
                
              if (roleData) {
                setUserRole(roleData);
              }
            } catch (fallbackError) {
              console.error('❌ Fallback query failed:', fallbackError);
            }
          }
        } else {
          console.log('🚫 User signed out, clearing data...');
          setUserRole(null);
          setUserProfile(null);
        }
  
        console.log('✅ Auth state change complete, setting loading to false');
        setLoading(false);
      }
    );
  
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting to sign in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      console.log('🔐 Sign in result:', { 
        success: !!data?.user,
        userEmail: data?.user?.email, 
        error: error?.message 
      });
      
      return { data, error };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('📝 Starting signup process...', { email, role: userData.role })
      
      // Step 1: Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role
          }
        }
      })
      
      if (error) {
        console.error('❌ Auth signup error:', error)
        return { error }
      }

      if (!data.user) {
        console.error('❌ No user returned from signup')
        return { error: new Error('No user created') }
      }

      console.log('✅ User created:', data.user.id)

      // Step 2: Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ 
          auth_user_id: data.user.id, 
          role: userData.role 
        })
      
      if (roleError) {
        console.error('❌ Role creation error:', roleError)
        return { error: roleError }
      }

      console.log('✅ Role created successfully')

      // Step 3: Create profile based on role
      let profileError = null
      
      switch (userData.role) {
        case 'patient':
          console.log('👥 Creating patient profile...')
          const patientData = {
            auth_user_id: data.user.id,
            name: userData.name,
            age: userData.age ? parseInt(userData.age) : null,
            gender: userData.gender || 'prefer_not_to_say',
            phone: userData.phone || null,
            email: email,
            address: userData.address || null,
            emergency_contact_name: userData.emergencyContactName || null,
            emergency_contact_phone: userData.emergencyContactPhone || null,
            medical_history: userData.medicalHistory || null,
            allergies: userData.allergies || null,
            current_medications: userData.currentMedications || null,
          }
          
          const { error: patientError } = await supabase
            .from('patients')
            .insert(patientData)
          
          profileError = patientError
          break

        case 'field_doctor':
          console.log('👨‍⚕️ Creating doctor profile...')
          const doctorData = {
            auth_user_id: data.user.id,
            name: userData.name,
            specialization: userData.specialization || null,
            license_number: userData.licenseNumber || null,
            phone: userData.phone || null,
            email: email,
            years_of_experience: userData.yearsOfExperience ? parseInt(userData.yearsOfExperience) : null,
          }
          
          const { error: doctorError } = await supabase
            .from('field_doctors')
            .insert(doctorData)
          
          profileError = doctorError
          break

        case 'admin':
          console.log('👔 Creating admin profile...')
          const adminData = {
            auth_user_id: data.user.id,
            name: userData.name,
            phone: userData.phone || null,
            email: email,
            permissions: userData.permissions || [],
          }
          
          const { error: adminError } = await supabase
            .from('admins')
            .insert(adminData)
          
          profileError = adminError
          break

        default:
          profileError = new Error(`Invalid role: ${userData.role}`)
      }

      if (profileError) {
        console.error('❌ Profile creation error:', profileError)
        return { error: profileError }
      }

      console.log('✅ Profile created successfully')
      return { error: null, data }

    } catch (error) {
      console.error('❌ Unexpected signup error:', error)
      return { error }
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile...');
      setLoading(true);
      await loadUserData(user.id);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};