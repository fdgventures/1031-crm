"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter, useParams } from "next/navigation";

type AdminInvitation = {
  id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  role_type: string;
  qi_company_id: string | null;
};

type NewUserProfile = {
  id: string;
  email: string;
  role: string;
  role_type: string;
  is_verified: boolean;
  qi_company_id?: string | null;
};

export default function RegisterInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const supabase = getSupabaseClient();

  const [invitation, setInvitation] = useState<AdminInvitation | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) {
      return err.message;
    }

    if (
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
    ) {
      return (err as { message: string }).message;
    }

    return fallback;
  }, []);

  const loadInvitation = useCallback(async () => {
    try {
      console.log("Loading invitation for token:", token);

      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("token", token)
        .single();

      console.log("Invitation query result:", { data, error });

      if (error || !data) {
        console.error("Invitation error:", error);
        setError("Invitation not found or has expired");
        setIsLoading(false);
        return;
      }

      // Проверяем статус
      if (data.status !== "pending") {
        console.log("Invitation status is not pending:", data.status);
        setError(`Invitation status is ${data.status}`);
        setIsLoading(false);
        return;
      }

      // Проверяем срок действия
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError("Invitation has expired");
        setIsLoading(false);
        return;
      }

      const normalizedInvitation: AdminInvitation = {
        id: data.id,
        email: data.email,
        token: data.token,
        status: data.status,
        expires_at: data.expires_at,
        role_type: data.role_type,
        qi_company_id: data.qi_company_id ?? null,
      };

      setInvitation(normalizedInvitation);
      setEmail(normalizedInvitation.email);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load invitation"));
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, supabase, token]);

  useEffect(() => {
    void loadInvitation();
  }, [loadInvitation]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!invitation) {
      setError("Invitation is missing");
      return;
    }

    setIsRegistering(true);

    try {
      // Регистрируем пользователя
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(`Registration error: ${authError.message}`);
        setIsRegistering(false);
        return;
      }

      if (!authData.user) {
        setError("User was not created");
        setIsRegistering(false);
        return;
      }

      // Создаем профиль
      const profileData: NewUserProfile = {
        id: authData.user.id,
        email,
        role: invitation.role_type,
        role_type: invitation.role_type,
        is_verified: false,
      };

      // Добавляем qi_company_id если есть в приглашении
      if (invitation.qi_company_id) {
        profileData.qi_company_id = invitation.qi_company_id;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert(profileData);

      if (profileError) {
        setError(`Profile error: ${profileError.message}`);
        setIsRegistering(false);
        return;
      }

      // Обновляем статус приглашения
      await supabase
        .from("admin_invitations")
        .update({ status: "accepted" })
        .eq("token", token);

      setSuccess(
        "Registration successful! Please check your email to verify your account."
      );

      setTimeout(() => {
        router.push("/admin/signin");
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => router.push("/admin/signin")}
              variant="primary"
            >
              Go to Sign In
            </Button>
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
              Complete Your Registration
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You&apos;ve been invited as{" "}
              {invitation?.role_type === "platform_super_admin"
                ? "Platform Super Admin"
                : "Admin"}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled
                placeholder="Your email"
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
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isRegistering}
              className="w-full"
              variant="primary"
            >
              {isRegistering ? "Registering..." : "Complete Registration"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
