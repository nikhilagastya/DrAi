import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AuthIndex() {
  useEffect(() => {
    // Add a short delay to ensure router is initialized
  
      router.push('/auth/role-selection'); // replace instead of push

   
  }, []);

  return null;
}
