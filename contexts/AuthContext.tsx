// import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
// import { User } from '@supabase/supabase-js';
// import { Slot, router } from 'expo-router';
// import {
//   supabase,
//   getUserRole,
//   UserRole,
//   Patient,
//   FieldDoctor,
//   Admin,
//   getPatientProfile,
//   getDoctorProfile,
//   getAdminProfile,
// } from '../lib/supabase';

// interface AuthContextType {
//   user: User | null;
//   userRole: UserRole | null;
//   userProfile: Patient | FieldDoctor | Admin | null;
//   loading: boolean;
//   signIn: (email: string, password: string) => Promise<{ data: any, error: any }>;
//   signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
//   signOut: () => Promise<void>;
//   refreshProfile: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error('useAuth must be used within an AuthProvider');
//   return context;
// };

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [userRole, setUserRole] = useState<UserRole | null>(null);
//   const [userProfile, setUserProfile] = useState<Patient | FieldDoctor | Admin | null>(null);
//   const [loading, setLoading] = useState(true);
  
//   // Refs to prevent infinite loops
//   const lastNavigatedRole = useRef<string | null>(null);
//   const lastNavigatedUserId = useRef<string | null>(null);
//   const isNavigating = useRef(false);
//  const [roleLoading, setRoleLoading] = useState(true);
//   // Navigation helper with guards
//   const navigateBasedOnRole = useCallback((role: string | null, currentUser: User | null) => {
//     const userId = currentUser?.id || null;
    
//     // Prevent duplicate navigation
//     if (isNavigating.current) {
//       console.log('🚫 Navigation already in progress, skipping');
//       return;
//     }
    
//     // Check if we already navigated for this user/role combination
//     if (lastNavigatedRole.current === role && lastNavigatedUserId.current === userId) {
//       console.log('🚫 Already navigated for this user/role, skipping');
//       return;
//     }
    
//     console.log('🧭 Navigating based on role:', { role, hasUser: !!currentUser, userId });
    
//     isNavigating.current = true;
//     lastNavigatedRole.current = role;
//     lastNavigatedUserId.current = userId;
    
//     // Use setTimeout to avoid navigation during render
//     setTimeout(() => {
//       try {
//         if (!currentUser) {
//           console.log('🚫 No user, redirecting to auth');
//           router.replace('/auth');
//         } else if (!role) {
//           console.log('⚠️ User without role, staying in auth');
//           router.replace('/auth');
//         } else {
//           switch (role) {
//             case 'patient':
//               console.log('🏥 Redirecting to patient dashboard');
//               router.push('/patient/profile');
//               break;
//             case 'field_doctor':
//               console.log('👨‍⚕️ Redirecting to doctor dashboard');
//               router.push('/doctor/profile');
//               break;
//             case 'admin':
//               console.log('👔 Redirecting to admin dashboard');
//               router.push('/admin');
//               break;
//             default:
//               console.log('❌ Unknown role, redirecting to auth');
//               router.push('/');
//           }
//         }
//       } catch (error) {
//         console.error('❌ Navigation error:', error);
//       } finally {
//         // Reset navigation flag after a delay
//         setTimeout(() => {
//           isNavigating.current = false;
//         }, 1000);
//       }
//     }, 100);
//   }, []);

  
//   // Fetch role & profile together with enhanced error handling
//   const loadUserData = useCallback(async (userId: string) => {
//     try {
//       console.log('🔍 Loading user data for:', userId);
      
//       // Add timeout wrapper for getUserRole
//       const getUserRoleWithTimeout = async (id: string) => {
//         const timeoutPromise = new Promise((_, reject) => 
//           setTimeout(() => reject(new Error('getUserRole timeout after 5 seconds')), 5000)
//         );
        
//         const getRolePromise = getUserRole(id);
//         return Promise.race([getRolePromise, timeoutPromise]);
//       };
      
//       console.log('📋 About to call getUserRole...');
//       const roleData = await getUserRoleWithTimeout(userId);
//       console.log('📋 Role data received:', roleData);
      
//       if (!roleData) {
//         console.warn('⚠️ No role found for user:', userId);
//         setUserRole(null);
//         setUserProfile(null);
//         return null;
//       }
      
//       setUserRole(roleData);

//       if (roleData?.role) {
//         console.log('👤 Loading profile for role:', roleData.role);
//         let profile: Patient | FieldDoctor | Admin | null = null;
        
//         try {
//           // Add timeout for profile loading too
//           const getProfileWithTimeout = async (role: string, id: string) => {
//             // const timeoutPromise = new Promise((_, reject) => 
//             //   setTimeout(() => reject(new Error(`get${role}Profile timeout after 5 seconds`)), 5000)
//             // );
            
//             let profilePromise;
           
//             switch (role) {
//               case 'patient':
//                 profilePromise = await getPatientProfile(id);
//                 break;
//               case 'field_doctor':
//                 profilePromise =await  getDoctorProfile(id);
//                 break;
//               case 'admin':
//                 profilePromise =await  getAdminProfile(id);
//                 break;
//               default:
//                 throw new Error(`Unknown role: ${role}`);
//             }

//             return profilePromise
//           };
          
//           console.log('🏥 About to load profile...');
        
//           console.log('✅ Profile loaded successfully:', !!profile);
          
//           setUserProfile(profile);
          
//           if (!profile) {
//             console.warn('⚠️ No profile found for user role:', roleData.role);
//           }
          
//         } catch (profileError) {
//           console.error('❌ Error loading profile:', profileError);
//           setUserProfile(null);
//         }

//         return roleData.role;
//       } else {
//         console.warn('⚠️ Role data exists but no role specified');
//         setUserProfile(null);
//         return null;
//       }
      
//     } catch (error) {
//       console.error('❌ Error in loadUserData:', error);
//       setUserRole(null);
//       setUserProfile(null);
//       return null;
//     }
//   }, []);

//   // Separate effect for initial auth check
//   useEffect(() => {
//     let mounted = true;

//     const initAuth = async () => {
//       try {
//         console.log('🚀 Initializing auth...');
//         setLoading(true);

//         // Get current session
//         const { data: { session }, error } = await supabase.auth.getSession();
//         if (error) {
//           console.error('❌ Error getting session:', error);
//         }
        
//         const currentUser = session?.user ?? null;
//         console.log('👤 Current user from session:', currentUser?.email || 'none');
        
//         if (mounted) {
//           setUser(currentUser);
          
//           if (currentUser) {
//             console.log('📱 About to load user data...');
            
//             try {
//               const role = await loadUserData(currentUser.id);
//               console.log('✅ User data loading completed, role:', role);
              
//               // Navigate after everything is loaded
//               if (mounted) {
//                 navigateBasedOnRole(role, currentUser);
//               }
//             } catch (error) {
//               console.error('❌ Error loading user data:', error);
//               if (mounted) {
//                 navigateBasedOnRole(null, currentUser);
//               }
//             }
//           } else {
//             navigateBasedOnRole(null, null);
//           }
//         }
//       } catch (error) {
//         console.error('❌ Error initializing auth:', error);
//         if (mounted) {
//           navigateBasedOnRole(null, null);
//         }
//       } finally {
//         if (mounted) {
//           console.log('✅ Auth initialization complete, setting loading to false');
//           setLoading(false);
//         }
//       }
//     };

//     initAuth();

//     return () => {
//       mounted = false;
//     };
//   }, []); // Empty dependency array - only run once

//   // Separate effect for auth state changes
//   useEffect(() => {
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(
//       async (event, session) => {
//         console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
       
//         if (session?.user?.id) {
//           setRoleLoading(true);
//           loadUserData(session.user.id).finally(() => setRoleLoading(false));
//         } else {
//           setRoleLoading(false);
//         }


//         // Reset navigation tracking on auth state change
//         lastNavigatedRole.current = null;
//         lastNavigatedUserId.current = null;
//         isNavigating.current = false;
        
//         setLoading(true);
//         const authUser = session?.user ?? null;
//         setUser(authUser);

//         if (authUser) {
//           console.log('👤 User authenticated, loading data...');
          
//           try {
//             // const role = await loadUserData(authUser.id);
//             const roleData=await supabase.from('user_roles').select('*').eq('auth_user_id', authUser.id).single();

//             const role =roleData.data?.role || null;
//             const profile = await 
//             console.log('✅ Auth state change data loading completed, role:', role);
            
//             // Navigate after everything is loaded
//             navigateBasedOnRole(role, authUser);
//           } catch (error) {
//             console.error('❌ Error loading user data on auth change:', error);
//             navigateBasedOnRole(null, authUser);
//           }
//         } else {
//           console.log('🚫 User signed out, clearing data...');
//           setUserRole(null);
//           setUserProfile(null);
//           navigateBasedOnRole(null, null);
//         }

//         console.log('✅ Auth state change complete, setting loading to false');
//         setLoading(false);
//       }
//     );

//     return () => {
//       subscription.unsubscribe();
//     };
//   }, []); // Empty dependency array - set up listener once

//   const signIn = async (email: string, password: string) => {
//     try {
//       console.log('🔐 Attempting to sign in:', email);
//       const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
//       console.log('🔐 Sign in result:', { 
//         success: !!data?.user,
//         userEmail: data?.user?.email, 
//         error: error?.message 
//       });
      
//       // Navigation will be handled by onAuthStateChange
//       return { data, error };
//     } catch (error) {
//       console.error('❌ Sign in error:', error);
//       return { data: null, error };
//     }
//   };

//   const signUp = async (email: string, password: string, userData: any) => {
//     try {
//       console.log('📝 Starting signup process...', { email, role: userData.role })
      
//       // Step 1: Create user in Supabase Auth
//       const { data, error } = await supabase.auth.signUp({ 
//         email, 
//         password,
//         options: {
//           data: {
//             name: userData.name,
//             role: userData.role
//           }
//         }
//       })
      
//       if (error) {
//         console.error('❌ Auth signup error:', error)
//         return { error }
//       }

//       if (!data.user) {
//         console.error('❌ No user returned from signup')
//         return { error: new Error('No user created') }
//       }

//       console.log('✅ User created:', data.user.id)

//       // Step 2: Create user role
//       const { error: roleError } = await supabase
//         .from('user_roles')
//         .insert({ 
//           auth_user_id: data.user.id, 
//           role: userData.role 
//         })
      
//       if (roleError) {
//         console.error('❌ Role creation error:', roleError)
//         return { error: roleError }
//       }

//       console.log('✅ Role created successfully')

//       // Step 3: Create profile based on role
//       let profileError = null
      
//       switch (userData.role) {
//         case 'patient':
//           console.log('👥 Creating patient profile...')
//           const patientData = {
//             auth_user_id: data.user.id,
//             name: userData.name,
//             age: userData.age ? parseInt(userData.age) : null,
//             gender: userData.gender || 'prefer_not_to_say',
//             phone: userData.phone || null,
//             email: email,
//             address: userData.address || null,
//             emergency_contact_name: userData.emergencyContactName || null,
//             emergency_contact_phone: userData.emergencyContactPhone || null,
//             medical_history: userData.medicalHistory || null,
//             allergies: userData.allergies || null,
//             current_medications: userData.currentMedications || null,
//           }
          
//           const { error: patientError } = await supabase
//             .from('patients')
//             .insert(patientData)
          
//           profileError = patientError
//           break

//         case 'field_doctor':
//           console.log('👨‍⚕️ Creating doctor profile...')
//           const doctorData = {
//             auth_user_id: data.user.id,
//             name: userData.name,
//             specialization: userData.specialization || null,
//             license_number: userData.licenseNumber || null,
//             phone: userData.phone || null,
//             email: email,
//             years_of_experience: userData.yearsOfExperience ? parseInt(userData.yearsOfExperience) : null,
//           }
          
//           const { error: doctorError } = await supabase
//             .from('field_doctors')
//             .insert(doctorData)
          
//           profileError = doctorError
//           break

//         case 'admin':
//           console.log('👔 Creating admin profile...')
//           const adminData = {
//             auth_user_id: data.user.id,
//             name: userData.name,
//             phone: userData.phone || null,
//             email: email,
//             permissions: userData.permissions || [],
//           }
          
//           const { error: adminError } = await supabase
//             .from('admins')
//             .insert(adminData)
          
//           profileError = adminError
//           break

//         default:
//           profileError = new Error(`Invalid role: ${userData.role}`)
//       }

//       if (profileError) {
//         console.error('❌ Profile creation error:', profileError)
//         return { error: profileError }
//       }

//       console.log('✅ Profile created successfully')
      
//       // Don't navigate here - let the auth state change handle it
//       return { error: null, data }

//     } catch (error) {
//       console.error('❌ Unexpected signup error:', error)
//       return { error }
//     }
//   };

//   const signOut = async () => {
//     try {
//       console.log('🚪 Signing out...');
//       // Reset navigation tracking
//       lastNavigatedRole.current = null;
//       lastNavigatedUserId.current = null;
//       isNavigating.current = false;
      
//       await supabase.auth.signOut();
//       // Navigation will be handled by onAuthStateChange
//     } catch (error) {
//       console.error('❌ Sign out error:', error);
//     }
//   };

//   const refreshProfile = async () => {
//     if (user) {
//       console.log('🔄 Refreshing profile...');
//       setLoading(true);
//       await loadUserData(user.id);
//       setLoading(false);
//     }
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         userRole,
//         userProfile,
//         loading,
//         signIn,
//         signUp,
//         signOut,
//         refreshProfile,
//       }}
//     >
      
//       {children}
//     </AuthContext.Provider>
//   );
// };

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import {
  supabase,
  getUserRole,
  getPatientProfile,
  getDoctorProfile,
  getAdminProfile,
  UserRole,
  Patient,
  FieldDoctor,
  Admin,
} from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  userProfile: Patient | FieldDoctor | Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<Patient | FieldDoctor | Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const handleAuthAndNavigation = async (authUser: User | null) => {
    setLoading(true);
    setUser(authUser);
  
    if (!authUser) {
      setUserRole(null);
      setUserProfile(null);
      router.replace('/auth');
      setLoading(false);
      return;
    }
  
    try {
      const roleData = await getUserRole(authUser.id);
      const role = roleData?.role as 'patient' | 'field_doctor' | 'admin' | undefined;
  
      if (!role) {
        setUserRole(null);
        setUserProfile(null);
        router.replace('/auth');
        setLoading(false);
        return;
      }
  
      setUserRole(roleData);
  
      // ✅ Navigate first (instant), then load profile
      if (role === 'patient') router.replace('/patient');
      else if (role === 'field_doctor') router.replace('/doctor');
      else if (role === 'admin') router.replace('/admin');
  
      // Fetch profile after navigation (non-blocking for UX)
      try {
        let profile: Patient | FieldDoctor | Admin | null = null;
        if (role === 'patient') profile = await getPatientProfile(authUser.id);
        else if (role === 'field_doctor') profile = await getDoctorProfile(authUser.id);
        else if (role === 'admin') profile = await getAdminProfile(authUser.id);
        setUserProfile(profile);
      } catch (e) {
        console.error('❌ Profile load failed:', e);
        setUserProfile(null);
      }
    } catch (e) {
      console.error('❌ Auth handling error:', e);
      setUserRole(null);
      setUserProfile(null);
      router.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
    
  };
  useEffect(() => {
    // Initial session check
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleAuthAndNavigation(session?.user ?? null);
    })();
  
    // 🔧 Correct destructure + unsubscribe
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 onAuthStateChange →', event, session?.user?.email);
      handleAuthAndNavigation(session?.user ?? null);
    });
  
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  

  

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
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await handleAuthAndNavigation(user);
  };

  return (
    <AuthContext.Provider
      value={{ user, userRole, userProfile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};


