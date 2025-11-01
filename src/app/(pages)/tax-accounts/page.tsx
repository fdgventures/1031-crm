"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";

interface TaxAccount {
  id: number;
  name: string;
  account_number?: string | null;
  profile_id?: number | null;
  entity_id?: number | null;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  entity?: {
    name: string;
    email?: string | null;
  };
}

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Entity {
  id: number;
  name: string;
  email?: string | null;
}

type NewTaxAccountInsert = {
  name: string;
  profile_id?: number;
  entity_id?: number;
  qi_company_id?: string | null;
};

export default function TaxAccountsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [taxAccounts, setTaxAccounts] = useState<TaxAccount[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"profile" | "entity">("profile");

  // Form fields
  const [taxAccountName, setTaxAccountName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");

  const loadTaxAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from("tax_accounts")
      .select(
        `
        *,
        profile:profile_id (
          first_name,
          last_name,
          email
        ),
        entity:entity_id (
          name,
          email
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setTaxAccounts((data ?? []) as TaxAccount[]);
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profile")
      .select("id, first_name, last_name, email")
      .order("first_name");

    if (error) {
      throw error;
    }

    setProfiles((data ?? []) as Profile[]);
  }, []);

  const loadEntities = useCallback(async () => {
    const { data, error } = await supabase
      .from("entities")
      .select("id, name, email")
      .order("name");

    if (error) {
      throw error;
    }

    setEntities((data ?? []) as Entity[]);
  }, []);

  const checkAdminAndLoadTaxAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from("user_profiles")
          .select("role_type, qi_company_id")
          .eq("id", user.id)
          .single();

        if (userProfileError) {
          throw userProfileError;
        }

        const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
        setIsAdmin(adminRoles.includes(userProfile?.role_type ?? ""));
      } else {
        setIsAdmin(false);
      }

      await Promise.all([loadTaxAccounts(), loadProfiles(), loadEntities()]);
    } catch (err) {
      console.error("Error checking admin:", err);
      setError(getErrorMessage(err, "Failed to load tax accounts"));
    } finally {
      setLoading(false);
    }
  }, [loadEntities, loadProfiles, loadTaxAccounts]);

  useEffect(() => {
    void checkAdminAndLoadTaxAccounts();
  }, [checkAdminAndLoadTaxAccounts]);

  const handleCreateTaxAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      const trimmedTaxAccountName = taxAccountName.trim();

      if (!trimmedTaxAccountName) {
        throw new Error("Tax Account Name is required");
      }

      const requiresProfile = accountType === "profile";
      const requiresEntity = accountType === "entity";

      const parsedProfileId = requiresProfile
        ? Number.parseInt(selectedProfileId, 10)
        : null;
      const parsedEntityId = requiresEntity
        ? Number.parseInt(selectedEntityId, 10)
        : null;

      if (requiresProfile && (parsedProfileId === null || Number.isNaN(parsedProfileId))) {
        throw new Error("Profile is required");
      }

      if (requiresEntity && (parsedEntityId === null || Number.isNaN(parsedEntityId))) {
        throw new Error("Entity is required");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      let qiCompanyId: string | null = null;
      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from("user_profiles")
          .select("qi_company_id")
          .eq("id", user.id)
          .single();

        if (userProfileError) {
          throw userProfileError;
        }

        qiCompanyId = (userProfile?.qi_company_id as string | null) ?? null;
      }

      const taxAccountInsert: NewTaxAccountInsert = {
        name: trimmedTaxAccountName,
      };

      if (parsedProfileId !== null && !Number.isNaN(parsedProfileId)) {
        taxAccountInsert.profile_id = parsedProfileId;
      }

      if (parsedEntityId !== null && !Number.isNaN(parsedEntityId)) {
        taxAccountInsert.entity_id = parsedEntityId;
      }

      if (qiCompanyId) {
        taxAccountInsert.qi_company_id = qiCompanyId;
      }

      const { data: taxAccount, error: taxAccountError } = await supabase
        .from("tax_accounts")
        .insert(taxAccountInsert)
        .select()
        .single();

      if (taxAccountError) {
        throw taxAccountError;
      }

      if (!taxAccount) {
        throw new Error("Failed to create tax account");
      }

      const createdTaxAccount = taxAccount as TaxAccount;

      let accountNumber = "";

      if (requiresEntity && parsedEntityId !== null && !Number.isNaN(parsedEntityId)) {
        const { data: entityData, error: entityError } = await supabase
          .from("entities")
          .select("name")
          .eq("id", parsedEntityId)
          .single();

        if (entityError) {
          throw entityError;
        }

        const { count, error: countError } = await supabase
          .from("tax_accounts")
          .select("*", { count: "exact", head: true })
          .not("entity_id", "is", null);

        if (countError) {
          throw countError;
        }

        const sequenceNumber = ((count ?? 0) + 1).toString().padStart(3, "0");
        const prefix = (entityData?.name || "ENT")
          .substring(0, 3)
          .toUpperCase()
          .padEnd(3, "X");
        accountNumber = `${prefix}${sequenceNumber}`;
      } else if (requiresProfile && parsedProfileId !== null && !Number.isNaN(parsedProfileId)) {
        const { data: profileData, error: profileError } = await supabase
          .from("profile")
          .select("last_name")
          .eq("id", parsedProfileId)
          .single();

        if (profileError) {
          throw profileError;
        }

        const { count, error: countError } = await supabase
          .from("tax_accounts")
          .select("*", { count: "exact", head: true })
          .not("profile_id", "is", null);

        if (countError) {
          throw countError;
        }

        const sequenceNumber = ((count ?? 0) + 1).toString().padStart(3, "0");
        const lastNamePrefix = (profileData?.last_name || "XXX")
          .substring(0, 3)
          .toUpperCase()
          .padEnd(3, "X");
        accountNumber = `INV${lastNamePrefix}${sequenceNumber}`;
      }

      if (accountNumber) {
        const { error: updateError } = await supabase
          .from("tax_accounts")
          .update({ account_number: accountNumber })
          .eq("id", createdTaxAccount.id);

        if (updateError) {
          console.error("Failed to update tax account number:", updateError);
        }
      }

      const businessNameToUse = businessName.trim()
        ? businessName.trim()
        : trimmedTaxAccountName;

      const { error: businessNameError } = await supabase
        .from("business_names")
        .insert({
          name: businessNameToUse,
          tax_account_id: createdTaxAccount.id,
        });

      if (businessNameError) {
        console.error("Business Name creation error:", businessNameError);
        throw new Error(
          `Failed to create Business Name: ${businessNameError.message}`
        );
      }

      setSuccess("Tax Account created successfully!");
      resetForm();
      await loadTaxAccounts();

      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error("Failed to create tax account:", err);
      setError(getErrorMessage(err, "Failed to create tax account"));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTaxAccountName("");
    setBusinessName("");
    setSelectedProfileId("");
    setSelectedEntityId("");
    setAccountType("profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tax accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Tax Accounts</h1>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              + Create Tax Account
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

        {/* Tax Accounts List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile / Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No tax accounts found
                  </td>
                </tr>
              ) : (
                taxAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/tax-accounts/${account.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.account_number || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.profile
                          ? `${account.profile.first_name} ${account.profile.last_name}`
                          : account.entity
                          ? account.entity.name
                          : "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.profile?.email || account.entity?.email || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tax-accounts/${account.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create Tax Account Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create Tax Account
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
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

                <form onSubmit={handleCreateTaxAccount} className="space-y-6">
                  {/* Account Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="profile"
                          checked={accountType === "profile"}
                          onChange={(e) => {
                            setAccountType(e.target.value as "profile" | "entity");
                            setSelectedProfileId("");
                            setSelectedEntityId("");
                          }}
                          className="mr-2"
                        />
                        <span>Profile</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="entity"
                          checked={accountType === "entity"}
                          onChange={(e) => {
                            setAccountType(e.target.value as "profile" | "entity");
                            setSelectedProfileId("");
                            setSelectedEntityId("");
                          }}
                          className="mr-2"
                        />
                        <span>Entity</span>
                      </label>
                    </div>
                  </div>

                  {/* Tax Account Name */}
                  <div>
                    <label
                      htmlFor="taxAccountName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Tax Account Name *
                    </label>
                    <input
                      type="text"
                      id="taxAccountName"
                      value={taxAccountName}
                      onChange={(e) => setTaxAccountName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Enter tax account name"
                    />
                  </div>

                  {/* Business Name */}
                  <div>
                    <label
                      htmlFor="businessName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Business Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Leave empty to use Tax Account Name"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If empty, a Business Name will be created with the same
                      name as the Tax Account
                    </p>
                  </div>

                  {/* Profile or Entity Selection */}
                  {accountType === "profile" ? (
                    <div>
                      <label
                        htmlFor="profileSelect"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Select Profile *
                      </label>
                      <select
                        id="profileSelect"
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select a Profile --</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name} (
                            {profile.email})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        This tax account will be linked to the selected profile
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="entitySelect"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Select Entity *
                      </label>
                      <select
                        id="entitySelect"
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select an Entity --</option>
                        {entities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name} {entity.email ? `(${entity.email})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        This tax account will be linked to the selected entity
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={creating}
                      variant="primary"
                      className="flex-1"
                    >
                      {creating ? "Creating..." : "Create Tax Account"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                        setError(null);
                        setSuccess(null);
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
      </div>
    </div>
  );
}
