"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Даем время на восстановление сессии
      await new Promise((resolve) => setTimeout(resolve, 100));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        router.push("/admin/signin");
        return;
      }

      setUser(user);

      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setProfile(profile);
        }
      } catch (profileErr) {
        console.error("Profile error:", profileErr);
        // Продолжаем даже если профиль не найден
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Auth check error:", err);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
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
                  : profile?.role_type}
              </p>
              <p>
                <strong>Verified:</strong> {profile?.is_verified ? "Yes" : "No"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(profile?.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
