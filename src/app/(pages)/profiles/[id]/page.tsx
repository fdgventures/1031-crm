"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
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
  updated_at?: string;
}

interface ProfileInvitation {
  id: number;
  token: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface TaxAccount {
  id: number;
  name: string;
  created_at: string;
}

interface Property {
  id: number;
  address: string;
  created_at: string;
  business_name?: {
    name: string;
    tax_account?: {
      name: string;
    };
  };
}

type PropertyRow = {
  id: number;
  address: string;
  created_at: string;
  business_name: {
    name: string | null;
    tax_account: {
      name: string | null;
    } | null;
  } | null;
};

export default function ProfileViewPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { id } = params;
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<ProfileInvitation | null>(null);

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  // Tax Accounts & Properties
  const [taxAccounts, setTaxAccounts] = useState<TaxAccount[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [showCreateTaxAccountModal, setShowCreateTaxAccountModal] =
    useState(false);
  const [newTaxAccountName, setNewTaxAccountName] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [creatingTaxAccount, setCreatingTaxAccount] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError(getErrorMessage(err, "Failed to load profile"));
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  const loadInvitation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profile_invitations")
        .select("*")
        .eq("profile_id", id)
        .eq("status", "pending")
        .single();

      if (data && !error) {
        setInvitation(data);
      }
    } catch (err) {
      console.log("No active invitation found", err);
    }
  }, [id, supabase]);

  const loadTaxAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tax_accounts")
        .select("id, name, created_at")
        .eq("profile_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTaxAccounts(data ?? []);
    } catch (err) {
      console.error("Failed to load tax accounts:", err);
    }
  }, [id, supabase]);

  const loadProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          address,
          created_at,
          business_name:business_name_id (
            name,
            tax_account:tax_account_id (
              name
            )
          )
        `
        )
        .not("business_name_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const propertyRows = (data ?? []) as unknown as PropertyRow[];
      const normalizedProperties: Property[] = propertyRows.map((property) => {
        const { business_name, ...rest } = property;

        if (!business_name?.name) {
          return { ...rest };
        }

        return {
          ...rest,
          business_name: {
            name: business_name.name,
            tax_account: business_name.tax_account?.name
              ? { name: business_name.tax_account.name }
              : undefined,
          },
        };
      });

      setProperties(normalizedProperties);
    } catch (err) {
      console.error("Failed to load properties:", err);
    }
  }, [supabase]);

  const checkAdminAndLoadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Проверяем, является ли пользователь админом
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("role_type")
          .eq("id", user.id)
          .single();

        const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
        const isUserAdmin = adminRoles.includes(userProfile?.role_type || "");
        setIsAdmin(isUserAdmin);

        // Пользователь может редактировать, если он админ или владелец профиля (по user_id)
        const { data: currentProfile } = await supabase
          .from("profile")
          .select("user_id")
          .eq("id", id)
          .single();

        const isOwner = currentProfile?.user_id === user.id;
        setCanEdit(isUserAdmin || isOwner);
      }

      await loadProfile();
      await loadInvitation();
      await loadTaxAccounts();
      await loadProperties();
    } catch (err) {
      console.error("Error checking admin:", err);
      setError(getErrorMessage(err, "Failed to load profile"));
      setLoading(false);
    }
  }, [id, loadInvitation, loadProfile, loadProperties, loadTaxAccounts, supabase]);

  useEffect(() => {
    void checkAdminAndLoadProfile();
  }, [checkAdminAndLoadProfile]);

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) {
      return null;
    }

    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);

    try {
      if (!profile?.email && !inviteEmail) {
        throw new Error("Email is required for invitation");
      }

      const emailToUse = inviteEmail || profile?.email;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Authentication required to send invitations");
      }

      // Create invitation
      const { data, error } = await supabase
        .from("profile_invitations")
        .insert([
          {
            profile_id: id,
            email: emailToUse,
            invited_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setInvitation(data);
      setInviteSuccess(
        `Invitation created! Link: ${window.location.origin}/register/${data.token}`
      );
      setShowInviteForm(false);
      setInviteEmail("");
    } catch (err) {
      console.error("Failed to create invitation:", err);
      setInviteError(getErrorMessage(err, "Failed to create invitation"));
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvitationLink = () => {
    if (invitation) {
      const link = `${window.location.origin}/register/${invitation.token}`;
      navigator.clipboard.writeText(link);
      setInviteSuccess("Link copied to clipboard!");
      setTimeout(() => setInviteSuccess(null), 3000);
    }
  };

  const handleCreateTaxAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setCreatingTaxAccount(true);

    try {
      if (!newTaxAccountName) {
        throw new Error("Tax Account Name is required");
      }

      // Создаем Tax Account
      const { data: taxAccount, error: taxAccountError } = await supabase
        .from("tax_accounts")
        .insert({
          name: newTaxAccountName,
          profile_id: id,
        })
        .select()
        .single();

      if (taxAccountError) throw taxAccountError;

      // Generate account_number for tax account
      // Format: INV + first 3 letters of last name (uppercase) + sequential number for profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profile")
        .select("last_name")
        .eq("id", id)
        .single();

      if (!profileError && profileData) {
        // Get count of profile tax accounts for sequential number
        const { count, error: countError } = await supabase
          .from("tax_accounts")
          .select("*", { count: "exact", head: true })
          .not("profile_id", "is", null);

        if (!countError) {
          const sequenceNumber = ((count || 0) + 1).toString().padStart(3, "0");
          const lastNamePrefix = (profileData?.last_name || "XXX")
            .substring(0, 3)
            .toUpperCase()
            .padEnd(3, "X");
          const accountNumber = `INV${lastNamePrefix}${sequenceNumber}`;

          // Update tax account with account_number
          await supabase
            .from("tax_accounts")
            .update({ account_number: accountNumber })
            .eq("id", taxAccount.id);
        }
      }

      // Создаем Business Name (всегда создается)
      const businessNameToUse =
        newBusinessName && newBusinessName.trim()
          ? newBusinessName.trim()
          : newTaxAccountName;

      const { error: businessNameError } = await supabase
        .from("business_names")
        .insert({
          name: businessNameToUse,
          tax_account_id: taxAccount.id,
        });

      if (businessNameError) {
        console.error("Business Name creation error:", businessNameError);
        throw new Error(
          `Failed to create Business Name: ${businessNameError.message}`
        );
      }

      setInviteSuccess("Tax Account created successfully!");
      setNewTaxAccountName("");
      setNewBusinessName("");
      setShowCreateTaxAccountModal(false);
      await loadTaxAccounts();

      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create tax account:", err);
      setInviteError(
        err instanceof Error ? err.message : "Failed to create tax account"
      );
    } finally {
      setCreatingTaxAccount(false);
    }
  };

  const openEditModal = () => {
    if (profile) {
      setEditFirstName(profile.first_name);
      setEditLastName(profile.last_name);
      setEditEmail(profile.email || "");
      setAvatarFile(null);
      setEditError(null);
      setEditSuccess(null);
      setShowEditModal(true);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profiles").getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      throw err;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(null);
    setEditLoading(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if provided
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update profile
      const { error } = await supabase
        .from("profile")
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          avatar_url: avatarUrl,
        })
        .eq("id", id);

      if (error) throw error;

      setEditSuccess("Profile updated successfully!");
      await loadProfile(); // Reload profile to show changes
      setTimeout(() => {
        setShowEditModal(false);
        setEditSuccess(null);
      }, 1500);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setEditError(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setEditLoading(false);
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
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mr-6 overflow-hidden">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      {profile.first_name.charAt(0)}
                      {profile.last_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="text-white">
                  <h1 className="text-4xl font-bold">
                    {profile.first_name} {profile.last_name}
                  </h1>
                </div>
              </div>
              {canEdit && (
                <Button
                  onClick={openEditModal}
                  variant="outline"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  ✏️ Edit Profile
                </Button>
              )}
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
                  Registration Status
                </h3>
                <p className="text-lg">
                  {profile.user_id ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Registered
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      ○ Not Registered
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Invitation Section - admins only */}
            {isAdmin && !profile.user_id && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Registration Invitation
                </h3>

                {inviteSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm text-green-600">{inviteSuccess}</p>
                  </div>
                )}

                {inviteError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{inviteError}</p>
                  </div>
                )}

                {invitation ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Active Invitation
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Email: {invitation.email}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Expires:{" "}
                          {new Date(invitation.expires_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={copyInvitationLink}
                        variant="primary"
                        className="ml-4"
                      >
                        📋 Copy Link
                      </Button>
                    </div>
                  </div>
                ) : showInviteForm ? (
                  <form onSubmit={handleCreateInvitation} className="space-y-4">
                    <div>
                      <label
                        htmlFor="inviteEmail"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email for invitation
                      </label>
                      <input
                        type="email"
                        id="inviteEmail"
                        value={inviteEmail || profile.email || ""}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={inviteLoading}
                        variant="primary"
                      >
                        {inviteLoading ? "Creating..." : "Create Invitation"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowInviteForm(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    onClick={() => setShowInviteForm(true)}
                    variant="primary"
                  >
                    📧 Send Invitation
                  </Button>
                )}
              </div>
            )}

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

        {/* Tax Accounts Section */}
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Tax Accounts
              </h2>
              {canEdit && (
                <Button
                  onClick={() => {
                    if (profile) {
                      setNewTaxAccountName(
                        `${profile.first_name} ${profile.last_name}`
                      );
                    }
                    setShowCreateTaxAccountModal(true);
                  }}
                  variant="primary"
                  size="small"
                >
                  + Create Tax Account
                </Button>
              )}
            </div>
          </div>

          <div className="p-6">
            {taxAccounts.length === 0 ? (
              <p className="text-gray-500 text-sm">No tax accounts found</p>
            ) : (
              <div className="space-y-3">
                {taxAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/tax-accounts/${account.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {account.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Created:{" "}
                          {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Properties Section */}
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              My Properties
            </h2>
          </div>

          <div className="p-6">
            {properties.length === 0 ? (
              <p className="text-gray-500 text-sm">No properties found</p>
            ) : (
              <div className="space-y-3">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {property.address}
                      </h3>
                      {property.business_name && (
                        <p className="text-sm text-gray-500 mt-1">
                          Business Name: {property.business_name.name}
                          {property.business_name.tax_account && (
                            <span className="ml-2">
                              • Tax Account:{" "}
                              {property.business_name.tax_account.name}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Added:{" "}
                        {new Date(property.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Tax Account Modal */}
        {showCreateTaxAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create Tax Account
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateTaxAccountModal(false);
                      setNewTaxAccountName("");
                      setNewBusinessName("");
                      setInviteError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {inviteError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{inviteError}</p>
                  </div>
                )}

                {inviteSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm text-green-600">{inviteSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleCreateTaxAccount} className="space-y-4">
                  <div>
                    <label
                      htmlFor="newTaxAccountName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Tax Account Name *
                    </label>
                    <input
                      type="text"
                      id="newTaxAccountName"
                      value={newTaxAccountName}
                      onChange={(e) => setNewTaxAccountName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Enter tax account name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newBusinessNameField"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Business Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="newBusinessNameField"
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Leave empty to use Tax Account Name"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If empty, a Business Name will be created with the same
                      name as the Tax Account
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={creatingTaxAccount}
                      variant="primary"
                      className="flex-1"
                    >
                      {creatingTaxAccount ? "Creating..." : "Create"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateTaxAccountModal(false);
                        setNewTaxAccountName("");
                        setNewBusinessName("");
                        setInviteError(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Profile
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {editSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm text-green-600">{editSuccess}</p>
                  </div>
                )}

                {editError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{editError}</p>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {avatarPreviewUrl ? (
                          <Image
                            src={avatarPreviewUrl}
                            alt="Preview"
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : profile?.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt="Current avatar"
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-2xl font-bold text-gray-400">
                            {editFirstName.charAt(0)}
                            {editLastName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setAvatarFile(e.target.files?.[0] || null)
                          }
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* First Name */}
                  <div>
                    <label
                      htmlFor="editFirstName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      id="editFirstName"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label
                      htmlFor="editLastName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="editLastName"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="editEmail"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="editEmail"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={editLoading}
                      variant="primary"
                      className="flex-1"
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
