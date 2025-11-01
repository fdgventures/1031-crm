"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const checkCurrentUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Проверяем роль пользователя
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role_type")
          .eq("id", user.id)
          .single();

        if (
          profile?.role_type &&
          ["workspace_owner", "platform_super_admin", "admin"].includes(
            profile.role_type
          )
        ) {
          router.push("/admin/dashboard");
        }
      }
    } catch {
      console.log("No current user");
    }
  }, [router, supabase]);

  useEffect(() => {
    // Не делаем автоматический редирект - показываем форму всегда
    // checkCurrentUser();
  }, [checkCurrentUser]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Starting sign in...");
    console.log("Email:", email);
    console.log("Password:", password ? "***" : "empty");

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Auth response:", { data, error });

      if (error) {
        setError(`Sign in error: ${error.message}`);
        return;
      }

      if (!data.user) {
        setError("Sign in failed");
        return;
      }

      // Проверяем роль пользователя
      console.log("Checking user profile...");
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, role_type")
        .eq("id", data.user.id)
        .single();

      console.log("Profile response:", { profile, profileError });

      // Check user role and redirect accordingly
      const isAdmin =
        profile?.role_type &&
        ["workspace_owner", "platform_super_admin", "admin"].includes(
          profile.role_type
        );

      if (isAdmin) {
        // Admin user - redirect to dashboard
        console.log("Admin user, redirecting to dashboard...");
        router.push("/admin/dashboard");
      } else {
        // Regular user - find their profile and redirect
        console.log("Regular user, finding profile...");
        const { data: userProfile, error: userProfileError } = await supabase
          .from("profile")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (userProfileError || !userProfile) {
          console.log("Profile not found, redirecting to home...");
          router.push("/");
        } else {
          console.log("Profile found, redirecting to profile page...");
          router.push(`/profiles/${userProfile.id}`);
        }
      }
    } catch (err) {
      console.log("Sign in error:", err);
      setError(
        `Sign in error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      console.log("Sign in process finished");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Admin Sign In
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to Platform Super Admin account
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              variant="primary"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an admin account?{" "}
              <button
                onClick={() => (window.location.href = "/admin/register")}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
