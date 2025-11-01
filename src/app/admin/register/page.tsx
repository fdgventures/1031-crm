"use client";

import React, { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const supabase = getSupabaseClient();

  const checkExistingAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "platform_super_admin")
        .single();

      if (data && !error) {
        // Разрешаем регистрацию только для workspace_owner
        // или если нет других админов
        setError(
          "Platform Super Admin already exists. Please sign in instead."
        );
        return true;
      }
      return false;
    } catch {
      console.log("No existing admin found, proceeding with registration");
      return false;
    }
  };

  const registerPlatformSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Проверяем, является ли это регистрация workspace_owner
      const isWorkspaceOwner = email === "fdgventures@gmail.com";

      if (!isWorkspaceOwner) {
        // Проверяем еще раз, есть ли уже админ (только для обычных пользователей)
        const adminExists = await checkExistingAdmin();
        if (adminExists) {
          setIsLoading(false);
          return;
        }
      }

      // Регистрируем пользователя через Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(`Registration error: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        setError("User was not created");
        return;
      }

      // Определяем роль в зависимости от email
      const roleType = isWorkspaceOwner
        ? "workspace_owner"
        : "platform_super_admin";

      // Создаем профиль пользователя с нужной ролью
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          role: "platform_super_admin",
          role_type: roleType,
          is_verified: false,
        });

      if (profileError) {
        setError(`Profile update error: ${profileError.message}`);
        return;
      }

      setEmailSent(true);
      setSuccess(
        "Registration successful! Please check your email and click the confirmation link."
      );
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    setResendLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(`Resend error: ${error.message}`);
      } else {
        setSuccess("Confirmation email sent again! Please check your inbox.");
      }
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Check Your Email
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ve sent a confirmation link to <strong>{email}</strong>
              </p>
            </div>

            <div className="mt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Next Steps:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Check your email inbox</li>
                  <li>2. Click the confirmation link</li>
                  <li>3. Come back and sign in</li>
                </ol>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => (window.location.href = "/admin/signin")}
                  variant="primary"
                  className="w-full"
                >
                  Go to Sign In
                </Button>

                <Button
                  onClick={resendConfirmationEmail}
                  disabled={resendLoading}
                  variant="outline"
                  className="w-full"
                >
                  {resendLoading ? "Sending..." : "Resend Email"}
                </Button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Register another account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Register Platform Super Admin
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Create the main administrator account
            </p>
          </div>

          <form
            className="mt-8 space-y-6"
            onSubmit={registerPlatformSuperAdmin}
          >
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
                placeholder="Minimum 6 characters"
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes("already exists") && (
                  <div className="mt-2">
                    <Button
                      onClick={() => (window.location.href = "/admin/signin")}
                      variant="outline"
                      size="small"
                    >
                      Go to Sign In
                    </Button>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              variant="primary"
            >
              {isLoading ? "Registering..." : "Register Super Admin"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              After registration, you&apos;ll receive an email confirmation link
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
