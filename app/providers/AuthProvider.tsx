"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { useAuth } from '@/store/useAuth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, initializeAuth, setUser, setProfile } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // This ensures hydration errors are avoided by only rendering client-specific content after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only initialize auth on the client side
    if (isClient) {
      initializeAuth();

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            console.log('User signed in or token refreshed:', session.user.email);
            
            // Always fetch the profile on auth state change to ensure it's up-to-date
            // This is critical for the login flow to work properly
            try {
              console.log('Fetching profile for user on auth change:', session.user.id);
              
              // Create a timeout promise to handle cases where profile fetch might hang
              const timeoutPromise = new Promise<any>((resolve) => {
                setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout in AuthProvider') }), 10000); // Increased timeout to 10 seconds
              });
              
              // Race between the profile fetch and the timeout
              const profilePromise = supabase
                .from('profiles')
                .select('role, department_id, email')
                .eq('id', session.user.id)
                .single();
              
              const result: { data: any | null; error: any | null } = await Promise.race([profilePromise, timeoutPromise]);
              const { data: profile, error } = result;
              
              if (error) {
                console.error('Error fetching profile on auth change:', error);
                // Even if profile fetch fails, we still have a valid user
                // This allows the app to function even without a profile
                setProfile(null);
                console.log('User authenticated but no profile found in AuthProvider');
              } else {
                console.log('Profile fetched successfully in AuthProvider:', profile);
                setProfile(profile);
              }
            } catch (err) {
              console.error('Exception fetching profile on auth change:', err);
              setProfile(null);
              console.log('User authenticated but profile fetch failed in AuthProvider');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          router.push('/login');
        }
      }
    );

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isClient, initializeAuth, setUser, setProfile, router]);

  return <>{children}</>;
}