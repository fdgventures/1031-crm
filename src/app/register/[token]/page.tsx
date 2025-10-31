"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter, useParams } from "next/navigation";

interface ProfileInvitation {
  id: number;
  profile_id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
}

export default function RegisterInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<ProfileInvitation | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }

    return fallback;
  }, []);

  const loadInvitation = useCallback(async () => {
    try {
      console.log("Loading invitation for token:", token);

      const { data: invitationData, error: invitationError } = await supabase
        .from("profile_invitations")
        .select("*")
        .eq("token", token)
        .single();

      console.log("Invitation query result:", {
        invitationData,
        invitationError,
      });

      if (invitationError || !invitationData) {
        console.error("Invitation error:", invitationError);
        setError("Invitation not found or has expired");
        setIsLoading(false);
        return;
      }

      // Check status
      if (invitationData.status !== "pending") {
        console.log("Invitation status is not pending:", invitationData.status);
        setError(
          `Invitation is already ${
            invitationData.status === "accepted" ? "accepted" : "inactive"
          }`
        );
        setIsLoading(false);
        return;
      }

      // Check expiration
      const expiresAt = new Date(invitationData.expires_at);
      if (expiresAt < new Date()) {
        setError("Invitation has expired");
        setIsLoading(false);
        return;
      }

      setInvitation(invitationData);
      setEmail(invitationData.email);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profile")
        .select("*")
        .eq("id", invitationData.profile_id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        setError("Failed to load profile information");
        setIsLoading(false);
        return;
      }

      setProfile(profileData);
    } catch (err) {
      console.error("Failed to load invitation:", err);
      setError(getErrorMessage(err, "Failed to load invitation"));
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, token]);

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

    if (!invitation || !profile) {
      setError("Missing invitation or profile information");
      return;
    }

    setIsRegistering(true);

    try {
      // Register user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            profile_id: invitation.profile_id,
          },
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

      // Update profile, linking user_id
      const { error: profileUpdateError } = await supabase
        .from("profile")
        .update({
          user_id: authData.user.id,
          email: email,
        })
        .eq("id", invitation.profile_id);

      if (profileUpdateError) {
        console.error("Profile update error:", profileUpdateError);
        setError(`Profile update error: ${profileUpdateError.message}`);
        setIsRegistering(false);
        return;
      }

      // Create user_profiles entry for regular user
      const { error: userProfileError } = await supabase
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          email: email,
          role: "user",
          role_type: "user",
          is_verified: false,
        });

      if (userProfileError) {
        console.warn("User profile creation warning:", userProfileError);
        // Don't stop the process, as this is not a critical error
      }

      // Update invitation status
      await supabase
        .from("profile_invitations")
        .update({ status: "accepted" })
        .eq("token", token);

      // Check if user is automatically signed in (depends on Supabase email confirmation settings)
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        // User is signed in
        setSuccess("Registration successful! Redirecting...");
        setTimeout(() => {
          router.push(`/profiles/${profile.id}`);
          router.refresh(); // Force refresh to update header
        }, 1500);
      } else {
        // User needs to confirm email
        setSuccess(
          "Registration successful! Please check your email to verify your account, then sign in."
        );
        setTimeout(() => {
          router.push("/admin/signin");
        }, 3000);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(getErrorMessage(err, "Failed to register"));
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
            <Button onClick={() => router.push("/")} variant="primary">
              Go to Home
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
            {profile && (
              <p className="mt-2 text-sm text-gray-600">
                You are invited to register and link to profile:{" "}
                <span className="font-semibold">
                  {profile.first_name} {profile.last_name}
                </span>
              </p>
            )}
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
