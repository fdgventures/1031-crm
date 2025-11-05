"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { DocumentRepository } from "@/components/document-repository";
import { TaskManager } from "@/components/TaskManager";
import { LogViewer } from "@/components/LogViewer";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { MessagingSystem } from "@/components/MessagingSystem";
import { FeeSchedule } from "@/components/FeeSchedule";
import { YearToDateReview } from "@/components/YearToDateReview";
import { TaxAccountTransactions } from "@/components/TaxAccountTransactions";

interface TaxAccount {
  id: number;
  name: string;
  account_number?: string | null;
  profile_id: number;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface BusinessName {
  id: number;
  name: string;
  tax_account_id: number;
  created_at: string;
  updated_at: string;
  properties?: Property[];
}

interface Property {
  id: number;
  address: string;
  business_name_id: number | null;
  created_at: string;
}

type PropertyBusinessNameSelection =
  | null
  | {
      id: number | null;
      name: string | null;
      tax_account_id: number | null;
    }
  | Array<{
      id: number | null;
      name: string | null;
      tax_account_id: number | null;
    }>;

export default function TaxAccountViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const numericId = Number.parseInt(id, 10);
  const supabase = getSupabaseClient();
  const [taxAccount, setTaxAccount] = useState<TaxAccount | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessNames, setBusinessNames] = useState<BusinessName[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create Business Name modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit Tax Account modal
  const [showEditTaxAccountModal, setShowEditTaxAccountModal] = useState(false);
  const [editTaxAccountName, setEditTaxAccountName] = useState("");
  const [editingTaxAccount, setEditingTaxAccount] = useState(false);

  // Edit Business Name modal
  const [showEditBusinessNameModal, setShowEditBusinessNameModal] =
    useState(false);
  const [editingBusinessNameId, setEditingBusinessNameId] = useState<
    number | null
  >(null);
  const [editBusinessNameValue, setEditBusinessNameValue] = useState("");
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);

  // Set page title
  useEffect(() => {
    if (taxAccount) {
      document.title = `${taxAccount.name} | Tax Accounts | 1031 Exchange CRM`;
    }
  }, [taxAccount]);

  // Property modals
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false);
  const [selectedBusinessNameId, setSelectedBusinessNameId] = useState<
    number | null
  >(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  const [propertyActionLoading, setPropertyActionLoading] = useState(false);
  
  // Edit Property modal
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null);
  const [editPropertyAddress, setEditPropertyAddress] = useState("");
  const [editingProperty, setEditingProperty] = useState(false);

  const loadBusinessNames = useCallback(async () => {
    if (Number.isNaN(numericId)) {
      throw new Error("Invalid tax account id");
    }

    try {
      // Get all business names for this tax account
      const { data: businessNamesData, error: businessNamesError } = await supabase
        .from("business_names")
        .select("*")
        .eq("tax_account_id", numericId)
        .order("created_at", { ascending: false });

      if (businessNamesError) throw businessNamesError;

      if (!businessNamesData || businessNamesData.length === 0) {
        setBusinessNames([]);
        return;
      }

      // Get all properties for these business names in ONE query
      const businessNameIds = businessNamesData.map((bn) => bn.id);
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .in("business_name_id", businessNameIds)
        .order("created_at", { ascending: false });

      if (propertiesError) throw propertiesError;

      // Group properties by business_name_id
      const propertiesByBusinessName: { [key: number]: Property[] } = {};
      (propertiesData || []).forEach((property) => {
        if (property.business_name_id) {
          if (!propertiesByBusinessName[property.business_name_id]) {
            propertiesByBusinessName[property.business_name_id] = [];
          }
          propertiesByBusinessName[property.business_name_id].push(property);
        }
      });

      // Attach properties to business names
      const businessNamesWithProperties = businessNamesData.map((bn) => ({
        ...bn,
        properties: propertiesByBusinessName[bn.id] || [],
      }));

      setBusinessNames(businessNamesWithProperties);
    } catch (err) {
      console.error("Failed to load business names:", err);
    }
  }, [numericId, supabase]);

  const loadAllProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .is("business_name_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllProperties(data || []);
    } catch (err) {
      console.error("Failed to load properties:", err);
    }
  }, [supabase]);

  const loadTaxAccount = useCallback(async () => {
    if (Number.isNaN(numericId)) {
      throw new Error("Invalid tax account id");
    }

    try {
      // Load Tax Account with Profile in ONE query using JOIN
      const { data: taxAccountData, error: taxAccountError } = await supabase
        .from("tax_accounts")
        .select(`
          *,
          profile:profile_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("id", numericId)
        .single();

      if (taxAccountError) throw taxAccountError;
      setTaxAccount(taxAccountData);

      // Set profile if exists
      if (taxAccountData.profile) {
        setProfile(Array.isArray(taxAccountData.profile) 
          ? taxAccountData.profile[0] 
          : taxAccountData.profile);
      }

      // Load Business Names and Properties in parallel
      await Promise.all([
        loadBusinessNames(),
        loadAllProperties()
      ]);
    } catch (err) {
      console.error("Failed to load tax account:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load tax account"
      );
    } finally {
      setLoading(false);
    }
  }, [loadAllProperties, loadBusinessNames, numericId, supabase]);

  const checkAdminAndLoadTaxAccount = useCallback(async () => {
    const startTime = performance.now();
    console.log('⏱️ Starting Tax Account page load...');
    
    try {
      const authStart = performance.now();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log(`✓ Auth check: ${(performance.now() - authStart).toFixed(0)}ms`);

      if (user) {
        const profileStart = performance.now();
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("role_type")
          .eq("id", user.id)
          .single();
        console.log(`✓ User profile: ${(performance.now() - profileStart).toFixed(0)}ms`);

        const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
        setIsAdmin(adminRoles.includes(userProfile?.role_type || ""));
      }

      const dataStart = performance.now();
      await loadTaxAccount();
      console.log(`✓ Tax Account data: ${(performance.now() - dataStart).toFixed(0)}ms`);
      
      const totalTime = (performance.now() - startTime).toFixed(0);
      console.log(`🏁 Total load time: ${totalTime}ms`);
    } catch (err) {
      console.error("Error checking admin:", err);
      setLoading(false);
    }
  }, [loadTaxAccount, supabase]);

  useEffect(() => {
    void checkAdminAndLoadTaxAccount();
  }, [checkAdminAndLoadTaxAccount]);

  const handleCreateBusinessName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      if (!newBusinessName) {
        throw new Error("Business Name is required");
      }

      if (Number.isNaN(numericId)) {
        throw new Error("Invalid tax account id");
      }

      const { error: insertError } = await supabase
        .from("business_names")
        .insert({
          name: newBusinessName,
          tax_account_id: numericId,
        });

      if (insertError) throw insertError;

      setSuccess("Business Name created successfully!");
      setNewBusinessName("");
      setShowCreateModal(false);
      await loadBusinessNames();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create business name:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create business name"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleAddExistingProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPropertyActionLoading(true);

    try {
      if (!selectedPropertyId || !selectedBusinessNameId) {
        throw new Error("Property selection is required");
      }

      // Get business name details to find tax account
      const { data: businessName, error: businessNameError } = await supabase
        .from("business_names")
        .select("id, name, tax_account_id")
        .eq("id", selectedBusinessNameId)
        .single();

      if (businessNameError) throw businessNameError;
      if (!businessName) throw new Error("Business name not found");

      // Update property with business_name_id
      const { error: updateError } = await supabase
        .from("properties")
        .update({ business_name_id: selectedBusinessNameId })
        .eq("id", selectedPropertyId);

      if (updateError) throw updateError;

      // Create current ownership record
      const ownershipData = {
        property_id: parseInt(selectedPropertyId),
        ownership_type: "current",
        tax_account_id: businessName.tax_account_id,
        vesting_name: businessName.name,
      };

      // Check if ownership already exists for this property and tax account
      const { data: existingOwnership, error: checkError } = await supabase
        .from("property_ownership")
        .select("id")
        .eq("property_id", parseInt(selectedPropertyId))
        .eq("tax_account_id", businessName.tax_account_id)
        .eq("vesting_name", businessName.name)
        .eq("ownership_type", "current")
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing ownership:", checkError);
        // Continue anyway
      }

      // Only create ownership if it doesn't exist
      if (!existingOwnership) {
        const { error: ownershipError } = await supabase
          .from("property_ownership")
          .insert([ownershipData]);

        if (ownershipError) {
          console.error("Failed to create ownership:", ownershipError);
          // Don't fail the whole operation, but log the error
        }
      }

      setSuccess("Property added successfully!");
      setShowAddPropertyModal(false);
      setSelectedPropertyId("");
      setSelectedBusinessNameId(null);
      await loadBusinessNames();
      await loadAllProperties();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to add property:", err);
      setError(err instanceof Error ? err.message : "Failed to add property");
    } finally {
      setPropertyActionLoading(false);
    }
  };

  const handleCreateNewProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPropertyActionLoading(true);

    try {
      if (!newPropertyAddress) {
        throw new Error("Property address is required");
      }

      if (!selectedBusinessNameId) {
        throw new Error("Please select a Business Name");
      }

      // Get business name details to find tax account
      const { data: businessName, error: businessNameError } = await supabase
        .from("business_names")
        .select("id, name, tax_account_id")
        .eq("id", selectedBusinessNameId)
        .single();

      if (businessNameError) throw businessNameError;
      if (!businessName) throw new Error("Business name not found");

      // Create property
      const { data: newProperty, error: insertError } = await supabase
        .from("properties")
        .insert({
          address: newPropertyAddress,
          business_name_id: selectedBusinessNameId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (!newProperty) throw new Error("Property creation failed");

      // Create current ownership record
      const ownershipData = {
        property_id: newProperty.id,
        ownership_type: "current",
        tax_account_id: businessName.tax_account_id,
        vesting_name: businessName.name,
      };

      const { error: ownershipError } = await supabase
        .from("property_ownership")
        .insert([ownershipData]);

      if (ownershipError) {
        console.error("Failed to create ownership:", ownershipError);
        // Don't fail the whole operation, but log the error
      }

      setSuccess("Property created successfully!");
      setShowCreatePropertyModal(false);
      setNewPropertyAddress("");
      setSelectedBusinessNameId(null);
      await loadBusinessNames();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create property:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create property"
      );
    } finally {
      setPropertyActionLoading(false);
    }
  };

  const handleRemoveProperty = async (propertyId: number) => {
    if (!confirm("Remove this property from the business name?")) return;

    try {
      // Get property's business name before removing
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select(
          "business_name_id, business_name:business_name_id(id, name, tax_account_id)"
        )
        .eq("id", propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Update property to remove business_name_id
      const { error: updateError } = await supabase
        .from("properties")
        .update({ business_name_id: null })
        .eq("id", propertyId);

      if (updateError) throw updateError;

      // Update ownership from "current" to "prior" if exists
      const businessNameSelection =
        property.business_name as PropertyBusinessNameSelection;
      const resolvedBusinessName = Array.isArray(businessNameSelection)
        ? businessNameSelection[0]
        : businessNameSelection;

      if (
        resolvedBusinessName &&
        resolvedBusinessName.name &&
        resolvedBusinessName.tax_account_id !== null
      ) {
        const { name: businessNameValue, tax_account_id: taxAccountId } =
          resolvedBusinessName;

        const { error: ownershipUpdateError } = await supabase
          .from("property_ownership")
          .update({ ownership_type: "prior" })
          .eq("property_id", propertyId)
          .eq("tax_account_id", taxAccountId)
          .eq("vesting_name", businessNameValue)
          .eq("ownership_type", "current");

        if (ownershipUpdateError) {
          console.error("Failed to update ownership:", ownershipUpdateError);
          // Continue anyway, property is already removed
        }
      }

      setSuccess("Property removed successfully!");
      await loadBusinessNames();
      await loadAllProperties();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to remove property:", err);
      setError(
        err instanceof Error ? err.message : "Failed to remove property"
      );
    }
  };

  const openEditPropertyModal = async (propertyId: number) => {
    try {
      const { data: property, error } = await supabase
        .from("properties")
        .select("address")
        .eq("id", propertyId)
        .single();

      if (error) throw error;

      setEditingPropertyId(propertyId);
      setEditPropertyAddress(property.address);
      setShowEditPropertyModal(true);
    } catch (err) {
      console.error("Failed to load property:", err);
      setError(err instanceof Error ? err.message : "Failed to load property");
    }
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEditingProperty(true);

    try {
      if (!editPropertyAddress || !editingPropertyId) {
        throw new Error("Property address is required");
      }

      const { error: updateError } = await supabase
        .from("properties")
        .update({ address: editPropertyAddress })
        .eq("id", editingPropertyId);

      if (updateError) throw updateError;

      setSuccess("Property updated successfully!");
      setShowEditPropertyModal(false);
      setEditingPropertyId(null);
      setEditPropertyAddress("");
      await loadBusinessNames();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update property:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update property"
      );
    } finally {
      setEditingProperty(false);
    }
  };

  const handleDeleteProperty = async (propertyId: number) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this property? This action cannot be undone."
      )
    )
      return;

    try {
      // Delete associated ownership records first
      const { error: ownershipError } = await supabase
        .from("property_ownership")
        .delete()
        .eq("property_id", propertyId);

      if (ownershipError) {
        console.error("Failed to delete ownership records:", ownershipError);
        // Continue anyway
      }

      // Delete the property
      const { error: deleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (deleteError) throw deleteError;

      setSuccess("Property deleted successfully!");
      await loadBusinessNames();
      await loadAllProperties();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to delete property:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete property"
      );
    }
  };

  const openEditTaxAccountModal = () => {
    if (taxAccount) {
      setEditTaxAccountName(taxAccount.name);
      setShowEditTaxAccountModal(true);
    }
  };

  const handleUpdateTaxAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEditingTaxAccount(true);

    try {
      if (!editTaxAccountName) {
        throw new Error("Tax Account Name is required");
      }

      const { error: updateError } = await supabase
        .from("tax_accounts")
        .update({ name: editTaxAccountName })
        .eq("id", numericId);

      if (updateError) throw updateError;

      setSuccess("Tax Account updated successfully!");
      setShowEditTaxAccountModal(false);
      await loadTaxAccount();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update tax account:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update tax account"
      );
    } finally {
      setEditingTaxAccount(false);
    }
  };

  const handleDeleteTaxAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this Tax Account? This will also delete all associated Business Names and unlink all Properties."
      )
    )
      return;

    try {
      const { error: deleteError } = await supabase
        .from("tax_accounts")
        .delete()
        .eq("id", numericId);

      if (deleteError) throw deleteError;

      setSuccess("Tax Account deleted successfully! Redirecting...");
      setTimeout(() => {
        router.push("/tax-accounts");
      }, 1500);
    } catch (err) {
      console.error("Failed to delete tax account:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete tax account"
      );
    }
  };

  const openEditBusinessNameModal = (businessName: BusinessName) => {
    setEditingBusinessNameId(businessName.id);
    setEditBusinessNameValue(businessName.name);
    setShowEditBusinessNameModal(true);
  };

  const handleUpdateBusinessName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEditingBusinessName(true);

    try {
      if (!editBusinessNameValue || !editingBusinessNameId) {
        throw new Error("Business Name is required");
      }

      const { error: updateError } = await supabase
        .from("business_names")
        .update({ name: editBusinessNameValue })
        .eq("id", editingBusinessNameId);

      if (updateError) throw updateError;

      setSuccess("Business Name updated successfully!");
      setShowEditBusinessNameModal(false);
      await loadBusinessNames();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update business name:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update business name"
      );
    } finally {
      setEditingBusinessName(false);
    }
  };

  const handleDeleteBusinessName = async (businessNameId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this Business Name? All associated Properties will be unlinked."
      )
    )
      return;

    try {
      const { error: deleteError } = await supabase
        .from("business_names")
        .delete()
        .eq("id", businessNameId);

      if (deleteError) throw deleteError;

      setSuccess("Business Name deleted successfully!");
      await loadBusinessNames();
      await loadAllProperties();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to delete business name:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete business name"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tax account...</p>
        </div>
      </div>
    );
  }

  if (error && !taxAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Tax Account
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => router.push("/tax-accounts")}
              variant="primary"
            >
              Back to Tax Accounts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => router.push("/tax-accounts")}
            variant="outline"
          >
            ← Back to Tax Accounts
          </Button>
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

        {/* Tax Account Details */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {taxAccount?.name}
            </h1>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={openEditTaxAccountModal}
                  variant="outline"
                  size="small"
                >
                  ✏️ Edit
                </Button>
                <Button
                  onClick={handleDeleteTaxAccount}
                  variant="destructive"
                  size="small"
                >
                  🗑️ Delete
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Profile
              </h3>
              {profile ? (
                <div>
                  <p className="text-lg text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
              ) : (
                <p className="text-gray-500">No profile linked</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Account Number
              </h3>
              <p className="text-lg text-gray-900">
                {taxAccount?.account_number || "—"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Created
              </h3>
              <p className="text-lg text-gray-900">
                {taxAccount && new Date(taxAccount.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Business Names Section */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Business Names</h2>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedBusinessNameId(null);
                    setSelectedPropertyId("");
                    setShowAddPropertyModal(true);
                  }}
                  variant="ghost"
                  size="small"
                >
                  + Add Existing Property
                </Button>
                <Button
                  onClick={() => {
                    setSelectedBusinessNameId(null);
                    setNewPropertyAddress("");
                    setShowCreatePropertyModal(true);
                  }}
                  variant="outline"
                  size="small"
                >
                  + Create Property
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  size="small"
                >
                  + Add Business Name
                </Button>
              </div>
            )}
          </div>

          {businessNames.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No business names found
            </div>
          ) : (
            <div className="space-y-6">
              {businessNames.map((businessName) => (
                <div
                  key={businessName.id}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {businessName.name}
                        </h3>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                openEditBusinessNameModal(businessName)
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              ✏️ Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() =>
                                handleDeleteBusinessName(businessName.id)
                              }
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Created:{" "}
                        {new Date(businessName.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Properties List */}
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Properties ({businessName.properties?.length || 0})
                    </h4>
                    {!businessName.properties ||
                    businessName.properties.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No properties assigned
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {businessName.properties.map((property) => (
                          <div
                            key={property.id}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded hover:bg-gray-100 transition-colors"
                          >
                            <div
                              onClick={() => router.push(`/properties/${property.id}`)}
                              className="flex-1 cursor-pointer"
                            >
                              <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                {property.address}
                              </p>
                              <p className="text-xs text-gray-500">
                                Added:{" "}
                                {new Date(
                                  property.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditPropertyModal(property.id);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                ✏️ Edit
                              </button>
                              {isAdmin && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveProperty(property.id);
                                    }}
                                    className="text-orange-600 hover:text-orange-800 text-sm"
                                  >
                                    📤 Unlink
                                  </button>
                                </>
                              )}
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProperty(property.id);
                                }}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Schedule Section */}
        <div className="mt-6">
          <FeeSchedule taxAccountId={numericId} isAdmin={isAdmin} />
        </div>

        {/* Year to Date Review Section */}
        <div className="mt-6">
          <YearToDateReview taxAccountId={numericId} />
        </div>

        {/* Transactions Section */}
        <div className="mt-6">
          <TaxAccountTransactions taxAccountId={numericId} />
        </div>

        {/* Document Repository Section */}
        <div className="mt-6">
          <DocumentRepository entityType="tax_account" entityId={id} />
        </div>

        {/* Create Business Name Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add Business Name
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewBusinessName("");
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateBusinessName} className="space-y-4">
                  <div>
                    <label
                      htmlFor="businessNameInput"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="businessNameInput"
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={creating}
                      variant="primary"
                      className="flex-1"
                    >
                      {creating ? "Creating..." : "Create"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewBusinessName("");
                        setError(null);
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

        {/* Add Existing Property Modal */}
        {showAddPropertyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add Existing Property
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddPropertyModal(false);
                      setSelectedPropertyId("");
                      setSelectedBusinessNameId(null);
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={handleAddExistingProperty}
                  className="space-y-4"
                >
                  {/* Tax Account - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Account
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                      {taxAccount?.name || "—"}
                    </div>
                  </div>

                  {/* Business Name Selection */}
                  <div>
                    <label
                      htmlFor="businessNameSelectForAdd"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Business Name (Owner/Vesting) *
                    </label>
                    <select
                      id="businessNameSelectForAdd"
                      value={selectedBusinessNameId || ""}
                      onChange={(e) => setSelectedBusinessNameId(Number(e.target.value) || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Select Business Name --</option>
                      {businessNames.map((bn) => (
                        <option key={bn.id} value={bn.id}>
                          {bn.name}
                        </option>
                      ))}
                    </select>
                    {businessNames.length === 0 && (
                      <p className="mt-1 text-xs text-yellow-600">
                        ⚠️ Create a Business Name first to associate with this property
                      </p>
                    )}
                  </div>

                  {/* Property Selection */}
                  <div>
                    <label
                      htmlFor="propertySelect"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Select Property *
                    </label>
                    <select
                      id="propertySelect"
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Select a Property --</option>
                      {allProperties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.address}
                        </option>
                      ))}
                    </select>
                    {allProperties.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        No available properties. All properties are already
                        assigned.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={
                        propertyActionLoading || allProperties.length === 0 || businessNames.length === 0
                      }
                      variant="primary"
                      className="flex-1"
                    >
                      {propertyActionLoading ? "Adding..." : "Add Property"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddPropertyModal(false);
                        setSelectedPropertyId("");
                        setSelectedBusinessNameId(null);
                        setError(null);
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

        {/* Create New Property Modal */}
        {showCreatePropertyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create New Property
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreatePropertyModal(false);
                      setNewPropertyAddress("");
                      setSelectedBusinessNameId(null);
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateNewProperty} className="space-y-4">
                  {/* Tax Account - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Account
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                      {taxAccount?.name || "—"}
                    </div>
                  </div>

                  {/* Business Name Selection */}
                  <div>
                    <label
                      htmlFor="businessNameSelect"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Business Name (Owner/Vesting) *
                    </label>
                    <select
                      id="businessNameSelect"
                      value={selectedBusinessNameId || ""}
                      onChange={(e) => setSelectedBusinessNameId(Number(e.target.value) || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Select Business Name --</option>
                      {businessNames.map((bn) => (
                        <option key={bn.id} value={bn.id}>
                          {bn.name}
                        </option>
                      ))}
                    </select>
                    {businessNames.length === 0 && (
                      <p className="mt-1 text-xs text-yellow-600">
                        ⚠️ Create a Business Name first to associate with this property
                      </p>
                    )}
                  </div>

                  {/* Property Address */}
                  <div>
                    <label
                      htmlFor="newPropertyAddress"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Property Address *
                    </label>
                    <AddressAutocomplete
                      value={newPropertyAddress}
                      onChange={setNewPropertyAddress}
                      placeholder="Start typing address..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={propertyActionLoading || businessNames.length === 0}
                      variant="primary"
                      className="flex-1"
                    >
                      {propertyActionLoading
                        ? "Creating..."
                        : "Create Property"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreatePropertyModal(false);
                        setNewPropertyAddress("");
                        setSelectedBusinessNameId(null);
                        setError(null);
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

        {/* Edit Tax Account Modal */}
        {showEditTaxAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Tax Account
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditTaxAccountModal(false);
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdateTaxAccount} className="space-y-4">
                  <div>
                    <label
                      htmlFor="editTaxAccountNameInput"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Tax Account Name *
                    </label>
                    <input
                      type="text"
                      id="editTaxAccountNameInput"
                      value={editTaxAccountName}
                      onChange={(e) => setEditTaxAccountName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Enter tax account name"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={editingTaxAccount}
                      variant="primary"
                      className="flex-1"
                    >
                      {editingTaxAccount ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditTaxAccountModal(false);
                        setError(null);
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

        {/* Edit Business Name Modal */}
        {showEditBusinessNameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Business Name
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditBusinessNameModal(false);
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdateBusinessName} className="space-y-4">
                  <div>
                    <label
                      htmlFor="editBusinessNameInput"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="editBusinessNameInput"
                      value={editBusinessNameValue}
                      onChange={(e) => setEditBusinessNameValue(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={editingBusinessName}
                      variant="primary"
                      className="flex-1"
                    >
                      {editingBusinessName ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditBusinessNameModal(false);
                        setError(null);
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

        {/* Edit Property Modal */}
        {showEditPropertyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Property
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditPropertyModal(false);
                      setEditingPropertyId(null);
                      setEditPropertyAddress("");
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleUpdateProperty} className="space-y-4">
                  <div>
                    <label
                      htmlFor="editPropertyAddressInput"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Property Address *
                    </label>
                    <AddressAutocomplete
                      value={editPropertyAddress}
                      onChange={setEditPropertyAddress}
                      placeholder="Start typing address..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={editingProperty}
                      variant="primary"
                      className="flex-1"
                    >
                      {editingProperty ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditPropertyModal(false);
                        setEditingPropertyId(null);
                        setEditPropertyAddress("");
                        setError(null);
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

        {/* Messaging System */}
        <div className="mt-6">
          <MessagingSystem
            entityType="tax_account"
            entityId={parseInt(id)}
            entityName={taxAccount?.name}
          />
        </div>

        {/* Tasks Section */}
        <div className="mt-6">
          <TaskManager
            entityType="tax_account"
            entityId={parseInt(id)}
            entityName={taxAccount?.name}
            onLogCreate={() => setLogRefreshTrigger(Date.now())}
          />
        </div>

        {/* Activity Log Section */}
        <div className="mt-6">
          <LogViewer
            entityType="tax_account"
            entityId={parseInt(id)}
            entityName={taxAccount?.name}
            refreshTrigger={logRefreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
