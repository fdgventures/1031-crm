"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Property {
  id: number;
  address: string;
  created_at: string;
  updated_at: string;
}

interface PropertyOwnership {
  id: number;
  ownership_type: "pending" | "current" | "prior";
  tax_account_id: number | null;
  vesting_name: string | null;
  non_exchange_name: string | null;
  transaction_id: number | null;
  created_at: string;
  tax_account?: {
    id: number;
    name: string;
    profile?: {
      first_name: string;
      last_name: string;
    };
    entity?: {
      name: string;
    };
  };
  transaction?: {
    id: number;
    transaction_number: string;
  };
}

interface TaxAccount {
  id: number;
  name: string;
  account_number?: string | null;
}

interface BusinessName {
  id: number;
  name: string;
  tax_account_id: number;
}

export default function PropertyViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerships, setOwnerships] = useState<PropertyOwnership[]>([]);

  // Current Ownership form
  const [showAddCurrentModal, setShowAddCurrentModal] = useState(false);
  const [isNonExchangeCurrent, setIsNonExchangeCurrent] = useState(false);
  const [selectedTaxAccountId, setSelectedTaxAccountId] = useState<string>("");
  const [selectedVestingName, setSelectedVestingName] = useState<string>("");
  const [nonExchangeName, setNonExchangeName] = useState("");
  const [taxAccountSearch, setTaxAccountSearch] = useState("");
  const [showTaxAccountDropdown, setShowTaxAccountDropdown] = useState(false);
  const [vestingNames, setVestingNames] = useState<BusinessName[]>([]);
  const [loadingOwnerships, setLoadingOwnerships] = useState(false);

  // Tax accounts and business names
  const [taxAccounts, setTaxAccounts] = useState<TaxAccount[]>([]);
  const [filteredTaxAccounts, setFilteredTaxAccounts] = useState<TaxAccount[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check admin role
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user && isMounted) {
            const { data: userProfile } = await supabase
              .from("user_profiles")
              .select("role_type")
              .eq("id", user.id)
              .single();

            if (isMounted) {
              const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
              setIsAdmin(adminRoles.includes(userProfile?.role_type || ""));
            }
          }
        } catch (profileErr) {
          console.error("Error checking admin role:", profileErr);
          // Continue even if admin check fails
        }

        // Load property and ownerships in parallel
        if (isMounted) {
          await Promise.all([
            loadProperty(),
            loadOwnerships(),
            loadTaxAccounts(),
          ]);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading property data:", err);
          setError(err instanceof Error ? err.message : "Failed to load property data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setShowTaxAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setProperty(data);
      } else {
        throw new Error("Property not found");
      }
    } catch (err: any) {
      console.error("Failed to load property:", err);
      throw err;
    }
  };

  const loadOwnerships = async () => {
    try {
      const { data, error } = await supabase
        .from("property_ownership")
        .select(
          `
          *,
          tax_account:tax_account_id (
            id,
            name,
            account_number,
            profile:profile_id (
              first_name,
              last_name
            ),
            entity:entity_id (
              name
            )
          ),
          transaction:transaction_id (
            id,
            transaction_number
          )
        `
        )
        .eq("property_id", resolvedParams.id)
        .order("ownership_type", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOwnerships(data || []);
    } catch (err) {
      console.error("Failed to load ownerships:", err);
      // Don't throw - ownerships loading failure shouldn't block page load
      setOwnerships([]);
    }
  };

  const loadTaxAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("tax_accounts")
        .select("id, name, account_number")
        .order("name");

      if (error) throw error;
      
      const accounts = data || [];
      setTaxAccounts(accounts);
      setFilteredTaxAccounts(accounts.slice(0, 10));
    } catch (err) {
      console.error("Failed to load tax accounts:", err);
      setTaxAccounts([]);
      setFilteredTaxAccounts([]);
    }
  };

  const loadBusinessNames = async (taxAccountId: number) => {
    try {
      const { data, error } = await supabase
        .from("business_names")
        .select("id, name, tax_account_id")
        .eq("tax_account_id", taxAccountId)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to load business names:", err);
      return [];
    }
  };

  useEffect(() => {
    if (taxAccountSearch) {
      const filtered = taxAccounts.filter(
        (ta) =>
          ta.name.toLowerCase().includes(taxAccountSearch.toLowerCase()) ||
          (ta.account_number &&
            ta.account_number.toLowerCase().includes(taxAccountSearch.toLowerCase()))
      );
      setFilteredTaxAccounts(filtered.slice(0, 10));
    } else {
      setFilteredTaxAccounts(taxAccounts.slice(0, 10));
    }
  }, [taxAccountSearch, taxAccounts]);

  useEffect(() => {
    if (selectedTaxAccountId) {
      loadBusinessNames(parseInt(selectedTaxAccountId)).then((bn) => {
        setVestingNames(bn);
      });
    } else {
      setVestingNames([]);
    }
  }, [selectedTaxAccountId]);

  const handleAddCurrentOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingOwnerships(true);

    try {
      if (!isNonExchangeCurrent) {
        if (!selectedTaxAccountId || !selectedVestingName) {
          throw new Error("Tax Account and Vesting Name are required");
        }
      } else {
        if (!nonExchangeName) {
          throw new Error("Non-exchange name is required");
        }
      }

      const ownershipData: any = {
        property_id: parseInt(resolvedParams.id),
        ownership_type: "current",
        tax_account_id: isNonExchangeCurrent ? null : parseInt(selectedTaxAccountId),
        vesting_name: isNonExchangeCurrent ? null : selectedVestingName,
        non_exchange_name: isNonExchangeCurrent ? nonExchangeName : null,
      };

      const { error: ownershipError } = await supabase
        .from("property_ownership")
        .insert([ownershipData]);

      if (ownershipError) throw ownershipError;

      // If added through tax account, link property to tax account's business name
      if (!isNonExchangeCurrent && selectedTaxAccountId && selectedVestingName) {
        // Find the business name
        const vestingNameObj = vestingNames.find((vn) => vn.name === selectedVestingName);
        if (vestingNameObj) {
          // Update property's business_name_id
          const { error: updateError } = await supabase
            .from("properties")
            .update({ business_name_id: vestingNameObj.id })
            .eq("id", resolvedParams.id);

          if (updateError) {
            console.error("Failed to link property to business name:", updateError);
          }
        }
      }

      setShowAddCurrentModal(false);
      resetCurrentForm();
      
      // Reload data in parallel
      await Promise.all([loadOwnerships(), loadProperty()]);
    } catch (err: any) {
      setError(err.message || "Failed to add current ownership");
    } finally {
      setLoadingOwnerships(false);
    }
  };

  const resetCurrentForm = () => {
    setIsNonExchangeCurrent(false);
    setSelectedTaxAccountId("");
    setSelectedVestingName("");
    setNonExchangeName("");
    setTaxAccountSearch("");
    setVestingNames([]);
  };

  const getOwnershipsByType = (type: "pending" | "current" | "prior") => {
    return ownerships.filter((o) => o.ownership_type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Property
            </h2>
            <p className="text-gray-600 mb-6">{error || "Property not found"}</p>
            <Button onClick={() => router.push("/properties")} variant="primary">
              Back to Properties
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pendingOwnerships = getOwnershipsByType("pending");
  const currentOwnerships = getOwnershipsByType("current");
  const priorOwnerships = getOwnershipsByType("prior");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/properties")} variant="outline">
            ← Back to Properties
          </Button>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 rounded-t-lg">
            <div className="flex items-center">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mr-6">
                <span className="text-3xl font-bold text-blue-600">🏠</span>
              </div>
              <div className="text-white">
                <h1 className="text-4xl font-bold">Property #{property.id}</h1>
                <p className="text-blue-100 mt-2">{property.address}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-b pb-4 md:border-b-0 md:pb-0 md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
                <p className="text-lg text-gray-900">{property.address}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500">
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(property.created_at).toLocaleString()}
                </div>
                <div className="mt-2 sm:mt-0">
                  <strong>Updated:</strong>{" "}
                  {new Date(property.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ownership Sections */}
        <div className="space-y-6">
          {/* Pending Ownership */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Ownership
              </h2>
              <span className="text-sm text-gray-500 bg-yellow-50 px-3 py-1 rounded-full">
                Future Owners (Buyers)
              </span>
            </div>
            <div className="p-6">
              {pendingOwnerships.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No pending ownership records
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingOwnerships.map((ownership) => (
                    <div
                      key={ownership.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {ownership.non_exchange_name ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {ownership.non_exchange_name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">Non-exchange buyer</p>
                            </div>
                          ) : ownership.tax_account ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {ownership.vesting_name || ownership.tax_account.name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {ownership.tax_account.profile
                                  ? `${ownership.tax_account.profile.first_name} ${ownership.tax_account.profile.last_name}`
                                  : ownership.tax_account.entity
                                  ? ownership.tax_account.entity.name
                                  : ownership.tax_account.name}
                              </p>
                            </div>
                          ) : null}
                          {ownership.transaction && (
                            <p className="text-xs text-gray-400 mt-2">
                              Transaction: {ownership.transaction.transaction_number}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(ownership.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Ownership */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Current Ownership
              </h2>
              {isAdmin && (
                <Button
                  onClick={() => setShowAddCurrentModal(true)}
                  variant="primary"
                  size="sm"
                >
                  + Add Owner
                </Button>
              )}
            </div>
            <div className="p-6">
              {currentOwnerships.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No current ownership records
                </p>
              ) : (
                <div className="space-y-3">
                  {currentOwnerships.map((ownership) => (
                    <div
                      key={ownership.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {ownership.non_exchange_name ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {ownership.non_exchange_name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">Non-exchange owner</p>
                            </div>
                          ) : ownership.tax_account ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {ownership.vesting_name || ownership.tax_account.name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {ownership.tax_account.profile
                                  ? `${ownership.tax_account.profile.first_name} ${ownership.tax_account.profile.last_name}`
                                  : ownership.tax_account.entity
                                  ? ownership.tax_account.entity.name
                                  : ownership.tax_account.name}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(ownership.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prior Ownership */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Prior Ownership
              </h2>
              <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                Previous Owners
              </span>
            </div>
            <div className="p-6">
              {priorOwnerships.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No prior ownership records
                </p>
              ) : (
                <div className="space-y-3">
                  {priorOwnerships.map((ownership) => (
                    <div
                      key={ownership.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {ownership.non_exchange_name ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {ownership.non_exchange_name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">Non-exchange owner</p>
                            </div>
                          ) : ownership.tax_account ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {ownership.vesting_name || ownership.tax_account.name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {ownership.tax_account.profile
                                  ? `${ownership.tax_account.profile.first_name} ${ownership.tax_account.profile.last_name}`
                                  : ownership.tax_account.entity
                                  ? ownership.tax_account.entity.name
                                  : ownership.tax_account.name}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(ownership.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Current Ownership Modal */}
        {showAddCurrentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add Current Owner
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddCurrentModal(false);
                      resetCurrentForm();
                      setError(null);
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

                <form onSubmit={handleAddCurrentOwnership} className="space-y-6">
                  {/* Owner Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner Type *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="tax_account"
                          checked={!isNonExchangeCurrent}
                          onChange={(e) => {
                            setIsNonExchangeCurrent(false);
                            setSelectedTaxAccountId("");
                            setSelectedVestingName("");
                            setNonExchangeName("");
                          }}
                          className="mr-2"
                        />
                        <span>Tax Account</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="non_exchange"
                          checked={isNonExchangeCurrent}
                          onChange={(e) => {
                            setIsNonExchangeCurrent(true);
                            setSelectedTaxAccountId("");
                            setSelectedVestingName("");
                            setNonExchangeName("");
                          }}
                          className="mr-2"
                        />
                        <span>Non-exchange</span>
                      </label>
                    </div>
                  </div>

                  {!isNonExchangeCurrent ? (
                    <>
                      {/* Tax Account Search */}
                      <div className="relative dropdown-container">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tax Account *
                        </label>
                        <input
                          type="text"
                          value={taxAccountSearch}
                          onChange={(e) => {
                            setTaxAccountSearch(e.target.value);
                            setShowTaxAccountDropdown(true);
                          }}
                          onFocus={() => setShowTaxAccountDropdown(true)}
                          placeholder="Search tax account..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showTaxAccountDropdown && filteredTaxAccounts.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredTaxAccounts.map((ta) => (
                              <div
                                key={ta.id}
                                onClick={() => {
                                  setSelectedTaxAccountId(ta.id.toString());
                                  setTaxAccountSearch(ta.name);
                                  setShowTaxAccountDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                              >
                                <div className="font-medium">{ta.name}</div>
                                {ta.account_number && (
                                  <div className="text-xs text-gray-500">
                                    {ta.account_number}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Vesting Name */}
                      {selectedTaxAccountId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vesting Name *
                          </label>
                          <select
                            value={selectedVestingName}
                            onChange={(e) => setSelectedVestingName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">-- Select Vesting Name --</option>
                            {vestingNames.map((vn) => (
                              <option key={vn.id} value={vn.name}>
                                {vn.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Owner Name *
                      </label>
                      <Input
                        value={nonExchangeName}
                        onChange={(e) => setNonExchangeName(e.target.value)}
                        required
                        placeholder="Enter owner name"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={loadingOwnerships}
                      variant="primary"
                      className="flex-1"
                    >
                      {loadingOwnerships ? "Adding..." : "Add Owner"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddCurrentModal(false);
                        resetCurrentForm();
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
      </div>
    </div>
  );
}
