"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Ensure this only runs on the client to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Delay redirect until auth state and profile are fully loaded
  useEffect(() => {
    if (!isClient || loading || redirecting) return;

    // Small buffer to allow session restoration before redirect
    const timer = setTimeout(() => {
      if (!user && !profile) {
        setRedirecting(true);
        console.warn("User not found. Redirecting to login...");
        router.push("/login");
      }
    }, 1000); // wait 1s before checking

    return () => clearTimeout(timer);
  }, [user, profile, loading, isClient, redirecting, router]);

  // Show loading screen while waiting for session or redirect
  if (!isClient || loading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
