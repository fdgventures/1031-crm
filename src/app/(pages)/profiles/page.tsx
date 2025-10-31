"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getErrorMessage } from "@/lib/get-error-message";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  user_id?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

interface Entity {
  id: number;
  name: string;
  email?: string | null;
  created_at: string;
}

type NewEntityInsert = {
  name: string;
  email?: string;
};

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"profiles" | "entities">("profiles");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === "entities") {
        const { data, error } = await supabase
          .from("entities")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setEntities((data ?? []) as Entity[]);
      } else {
        const { data, error } = await supabase
          .from("profile")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProfiles((data ?? []) as Profile[]);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(
        getErrorMessage(
          err,
          `Failed to load ${activeTab === "entities" ? "entities" : "profiles"}`
        )
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const checkAdminAndLoadProfiles = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role_type")
        .eq("id", user.id)
        .single();

      const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
      setIsAdmin(adminRoles.includes(profile?.role_type || ""));
    } catch (err) {
      console.error("Error checking admin:", err);
      setError(getErrorMessage(err, "Failed to load profiles"));
    }
  }, []);

  useEffect(() => {
    void checkAdminAndLoadProfiles();
  }, [checkAdminAndLoadProfiles]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (activeTab === "entities") {
        const insertData: NewEntityInsert = {
          name: formData.name.trim(),
        };

        if (formData.email) {
          insertData.email = formData.email.trim();
        }

        const { error } = await supabase
          .from("entities")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        setSuccess("Entity created successfully!");
      } else {
        // Create individual profile (this part can be extended later if needed)
        throw new Error("Creating individual profiles from this page is not yet implemented");
      }

      setShowCreateForm(false);
      setFormData({
        name: "",
        email: "",
      });
      await loadProfiles();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          `Failed to create ${activeTab === "entities" ? "entity" : "profile"}`
        )
      );
    }
  };

  if (loading) {
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profiles</h1>
            {/* Tabs for switching between Profiles and Entities */}
            <div className="mt-4 flex space-x-1 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("profiles")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "profiles"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Individual Profiles
              </button>
              <button
                onClick={() => setActiveTab("entities")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "entities"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Entities
              </button>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="primary"
            >
              {showCreateForm ? "Cancel" : `+ Create ${activeTab === "entities" ? "Entity" : "Profile"}`}
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Create New {activeTab === "entities" ? "Entity" : "Profile"}
            </h2>
            <form onSubmit={handleCreateProfile}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={activeTab === "entities" ? "Company Name *" : "Name *"}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder={activeTab === "entities" ? "Company Name" : "Name"}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="mt-6">
                <Button type="submit" variant="primary">
                  Create {activeTab === "entities" ? "Entity" : "Profile"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === "entities" ? (
                  entities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No entities found
                      </td>
                    </tr>
                  ) : (
                    entities.map((entity) => (
                      <tr
                        key={entity.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/entities/${entity.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                              <span className="text-blue-600 font-medium">
                                {entity.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {entity.name}
                              </div>
                              <div className="text-xs text-gray-500">Entity</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {entity.email || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">—</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entity.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  profiles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No profiles found
                      </td>
                    </tr>
                  ) : (
                    profiles.map((profile) => (
                      <tr
                        key={profile.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/profiles/${profile.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                              {profile.avatar_url ? (
                                <Image
                                  src={profile.avatar_url}
                                  alt={`${profile.first_name} ${profile.last_name}`}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-blue-600 font-medium">
                                  {profile.first_name.charAt(0)}
                                  {profile.last_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {profile.first_name} {profile.last_name && profile.last_name.trim() !== "" ? profile.last_name : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {profile.email || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {profile.user_id || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
