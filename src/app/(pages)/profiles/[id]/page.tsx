"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  user_id?: string | null;
  created_at: string;
}

export default function ProfileViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [resolvedParams.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error("Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Profile
            </h2>
            <p className="text-gray-600 mb-6">{error || "Profile not found"}</p>
            <Button onClick={() => router.push("/profiles")} variant="primary">
              Back to Profiles
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/profiles")} variant="outline">
            ← Back to Profiles
          </Button>
        </div>

        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 rounded-t-lg">
            <div className="flex items-center">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mr-6">
                <span className="text-3xl font-bold text-blue-600">
                  {profile.first_name.charAt(0)}
                  {profile.last_name.charAt(0)}
                </span>
              </div>
              <div className="text-white">
                <h1 className="text-4xl font-bold">
                  {profile.first_name} {profile.last_name}
                </h1>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-b pb-4 md:border-b-0 md:pb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Email
                </h3>
                <p className="text-lg text-gray-900">
                  {profile.email || "Not provided"}
                </p>
              </div>
              <div className="border-b pb-4 md:border-b-0 md:pb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  User ID
                </h3>
                <p className="text-lg text-gray-900">
                  {profile.user_id || "Not provided"}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500">
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(profile.created_at).toLocaleString()}
                </div>
                {profile.updated_at && (
                  <div className="mt-2 sm:mt-0">
                    <strong>Updated:</strong>{" "}
                    {new Date(profile.updated_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
