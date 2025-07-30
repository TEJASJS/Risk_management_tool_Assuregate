import { create } from 'zustand';
import supabase from '@/lib/supabaseClient';

interface AuthState {
  user: any | null;
  profile: {
    role: 'super_admin' | 'department_head' | 'assessor' | 'reviewer' | null;
    department_id: string | null;
    email: string | null;
  } | null;
  loading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: AuthState['profile']) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, profile: null, loading: false }),
  initializeAuth: async () => {
    set({ loading: true });
    try {
      console.log('Initializing auth: Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Session found, user authenticated:', session.user.email);
        
        // Set the user immediately to ensure we have authentication state
        set({ user: session.user, loading: true });
        
        try {
          console.log('Fetching profile for user:', session.user.id);
          
          // Create a timeout promise to handle cases where profile fetch might hang
          const timeoutPromise = new Promise<any>((resolve) => {
            setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout in useAuth') }), 15000); // Increased timeout to 15 seconds for better reliability
          });
          
          // Race between the profile fetch and the timeout
          const profilePromise = supabase
            .from('profiles')
            .select('role, department_id, email')
            .eq('id', session.user.id)
            .single();
          
          const result = await Promise.race([profilePromise, timeoutPromise]) as { data: any; error: any };
          const { data: profile, error } = result;
          
          if (error) {
            console.error('Error fetching profile:', error);
            // Don't reset user on profile fetch error, just set profile to null
            // This allows login to continue even if profile fetch fails
            set({ user: session.user, profile: null, loading: false });
            
            // Retry profile fetch once after a short delay
            setTimeout(async () => {
              try {
                console.log('Retrying profile fetch for user:', session.user.id);
                const { data: retryProfile, error: retryError } = await supabase
                  .from('profiles')
                  .select('role, department_id, email')
                  .eq('id', session.user.id)
                  .single();
                  
                if (retryError) {
                  console.error('Retry profile fetch failed:', retryError);
                } else if (retryProfile) {
                  console.log('Retry profile fetch succeeded:', retryProfile);
                  set({ profile: retryProfile });
                }
              } catch (retryErr) {
                console.error('Exception during profile fetch retry:', retryErr);
              }
            }, 2000); // Retry after 2 seconds
          } else {
            console.log('Profile fetched successfully:', profile);
            set({ user: session.user, profile: profile, loading: false });
          }
        } catch (err) {
          console.error('Exception fetching profile:', err);
          // Keep the user session but set profile to null
          set({ user: session.user, profile: null, loading: false });
        }
      } else {
        console.log('No session found, user not authenticated');
        set({ user: null, profile: null, loading: false });
      }
    } catch (err) {
      console.error('Error getting session:', err);
      set({ user: null, profile: null, loading: false });
    }
  },
}));