"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";
import { FeeScheduleManager } from "@/components/FeeScheduleManager";

type AuthUser = {
  id: string;
  email?: string | null;
};

type DashboardProfile = {
  id: string;
  email?: string | null;
  role_type?: string | null;
  is_verified?: boolean;
  created_at?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set page title
  useEffect(() => {
    document.title = "Admin Dashboard | 1031 Exchange CRM";
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authUser) {
        setUser(null);
        setProfile(null);
        router.push("/admin/signin");
        return;
      }

      setUser({ id: authUser.id, email: authUser.email });

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData as DashboardProfile);
      } else if (profileError) {
        console.error("Profile error:", profileError);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      router.push("/admin/signin");
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", getErrorMessage(err, "Failed to sign out"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Welcome, {user?.email}
                {profile?.role_type === "workspace_owner" &&
                  " 👑 (Workspace Owner)"}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                👥 Admin Management
              </h3>
              <p className="text-blue-700 text-sm mb-4">
                Invite new administrators and manage existing ones
              </p>
              <Button
                variant="primary"
                size="small"
                onClick={() => router.push("/admin/admins")}
                className="w-full"
              >
                Manage Admins
              </Button>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                QI Companies
              </h3>
              <p className="text-green-700 text-sm mb-4">
                Manage Qualified Intermediary companies
              </p>
              <Button variant="outline" size="small">
                Coming Soon
              </Button>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                System Settings
              </h3>
              <p className="text-purple-700 text-sm mb-4">
                Configure platform settings
              </p>
              <Button variant="outline" size="small">
                Coming Soon
              </Button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              Account Information
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Role:</strong>{" "}
                {profile?.role_type === "workspace_owner"
                  ? "👑 Workspace Owner"
                  : profile?.role_type ?? "Unknown"}
              </p>
              <p>
                <strong>Verified:</strong> {profile?.is_verified ? "Yes" : "No"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Fee Schedule Manager Section */}
        <div className="mt-8">
          <FeeScheduleManager />
        </div>
      </div>
    </div>
  );
}
