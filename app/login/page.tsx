"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/store/useAuth";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [formValid, setFormValid] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';
  const { user, profile, initializeAuth } = useAuth();

  // Prevent hydration errors by only rendering client-specific content after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if user and profile are already logged in and loaded
  useEffect(() => {
    // Only run on client side and when auth state is available
    if (!isClient) return;
    
    if (user && profile) {
      console.log('User already logged in, redirecting based on role');
      redirectBasedOnRole(profile);
    }
  }, [user, profile, router, isClient]);

  // Validate form
  useEffect(() => {
    setFormValid(email.trim() !== "" && password.trim() !== "" && !emailError);
  }, [email, password, emailError]);

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    } else {
      setEmailError("");
      return true;
    }
  };

  const redirectBasedOnRole = (profile: any) => {
    if (!profile) {
      console.log("User authenticated but no profile found. Redirecting to default page.");
      router.push("/");
      return;
    }

    // If there's a returnTo parameter and it's a relative path, use it
    if (returnTo && !returnTo.startsWith('http') && !returnTo.startsWith('//')) {
      console.log(`Redirecting to requested page: ${returnTo}`);
      router.push(returnTo);
      return;
    }

    // Redirect by role
    if (profile.role === "super_admin") router.push("/admin");
    else if (profile.role === "department_head") router.push("/dashboard");
    else if (profile.role === "assessor") router.push("/risk-assessment");
    else if (profile.role === "reviewer") router.push("/risk-assessment");
    else router.push("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      console.log('Attempting login with email:', email);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError || !data.user) {
        console.error('Login error:', signInError?.message);
        setError(signInError?.message || "Login failed");
        setLoading(false);
        return;
      }

      console.log("Login successful, initializing auth...");
      await initializeAuth(); // Fetch and set user/profile in store
      
      // Get the updated profile from the store after initialization
      const { profile: currentProfile, user: currentUser } = useAuth.getState();
      console.log("Auth state after initialization:", { user: !!currentUser, profile: !!currentProfile });
      
      setLoading(false);

      if (!currentUser) {
        setError("Authentication failed. Please try again.");
        return;
      }
      
      // If we have a user but no profile, we should still redirect
      // This handles the case where the profile fetch fails but authentication succeeds
      if (currentUser && !currentProfile) {
        console.log("User authenticated but no profile found. Creating default redirect.");
        // Redirect to a default page or show a message
        router.push("/");
        return;
      }

      redirectBasedOnRole(currentProfile);
    } catch (err) {
      console.error("Error during login process:", err);
      setError("An error occurred during login. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 text-white">
      <div className="absolute inset-0 bg-[url('/globe.svg')] bg-no-repeat bg-center opacity-5 pointer-events-none" />
      <div className="w-full max-w-md z-10">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl shadow-2xl p-10 w-full space-y-8 border border-blue-900/10"
        >
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg mb-3">
              🛡️
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0a174e] mb-1">AssureGate</h1>
            <div className="text-blue-700 text-base font-medium">Risk Management Tool</div>
          </div>
          
          {error && (
            <div className="text-red-500 font-semibold text-center bg-red-50 border border-red-200 rounded-lg p-3 animate-fadeIn">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium text-[#0a174e]">Email</label>
              <input
                type="email"
                className={`w-full px-4 py-3 rounded-lg border ${emailError ? 'border-red-300 bg-red-50' : 'border-blue-200'} text-[#0a174e] placeholder:text-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                required
                autoFocus
                placeholder="Enter your email"
              />
              {emailError && <p className="mt-1 text-sm text-red-500">{emailError}</p>}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium text-[#0a174e]">Password</label>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200">Forgot Password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 rounded-lg border border-blue-200 text-[#0a174e] placeholder:text-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pr-12 transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 focus:outline-none transition-colors duration-200"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12l2-2m0 0l4-4m-4 4l-4-4m4 4l4 4m6-4v6m-6-6h12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className={`w-full py-3 rounded-xl ${formValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'} text-white font-bold text-lg shadow-lg transition-all duration-200 focus:ring-2 focus:ring-blue-400`}
              disabled={loading || !formValid}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> 
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </div>
          

        </form>
        
        <div className="text-center mt-6 text-blue-200 text-sm">
          © {new Date().getFullYear()} AssureGate Risk Management Tool
        </div>
      </div>
    </div>
  );
}