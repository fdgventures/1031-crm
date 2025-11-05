"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

interface BusinessCard {
  id: number;
  business_name: string;
  logo_url: string | null;
  email: string;
  created_at: string;
}

interface Branch {
  branch_name: string;
  state: string;
  address: string;
  email: string;
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

export default function BusinessCardsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [businessCards, setBusinessCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "Business Cards | 1031 Exchange CRM";
  }, []);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [branches, setBranches] = useState<Branch[]>([
    {
      branch_name: "",
      state: "",
      address: "",
      email: "",
    },
  ]);

  useEffect(() => {
    checkAdminAndLoadBusinessCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAndLoadBusinessCards = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role_type")
          .eq("id", user.id)
          .single();

        const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
        setIsAdmin(adminRoles.includes(profile?.role_type || ""));
      }

      await loadBusinessCards();
    } catch (err) {
      console.error("Error checking admin:", err);
      setLoading(false);
    }
  };

  const loadBusinessCards = async () => {
    try {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinessCards(data || []);
    } catch (err) {
      console.error("Failed to load business cards:", err);
      setError("Failed to load business cards");
    } finally {
      setLoading(false);
    }
  };

  const addBranch = () => {
    setBranches([
      ...branches,
      {
        branch_name: "",
        state: "",
        address: "",
        email: "",
      },
    ]);
  };

  const removeBranch = (index: number) => {
    setBranches(branches.filter((_, i) => i !== index));
  };

  const updateBranch = (index: number, field: keyof Branch, value: string) => {
    const newBranches = [...branches];
    newBranches[index][field] = value;
    setBranches(newBranches);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bs_card")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("bs_card").getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Failed to upload logo:", err);
      return null;
    }
  };

  const handleCreateBusinessCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      // Upload logo if provided
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
        if (!logoUrl) {
          throw new Error("Failed to upload logo");
        }
      }

      // Create business card
      const { data: businessCard, error: bcError } = await supabase
        .from("business_cards")
        .insert([
          {
            business_name: businessName,
            email: email,
            logo_url: logoUrl,
          },
        ])
        .select()
        .single();

      if (bcError) throw bcError;

      // Create branches if any are filled
      const filledBranches = branches.filter(
        (b) => b.branch_name || b.state || b.address || b.email
      );

      if (filledBranches.length > 0) {
        const branchesData = filledBranches.map((branch) => ({
          business_card_id: businessCard.id,
          ...branch,
        }));

        const { error: branchError } = await supabase
          .from("branches")
          .insert(branchesData);

        if (branchError) throw branchError;
      }

      setSuccess("Business card created successfully!");
      setShowCreateModal(false);
      resetForm();
      await loadBusinessCards();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create business card"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setBusinessName("");
    setEmail("");
    setLogoFile(null);
    setBranches([
      {
        branch_name: "",
        state: "",
        address: "",
        email: "",
      },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Business Cards</h1>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              + Create Business Card
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businessCards.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No business cards found</p>
            </div>
          ) : (
            businessCards.map((card) => (
              <div
                key={card.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/business-cards/${card.id}`)}
              >
                <div className="flex items-center mb-4">
                  {card.logo_url ? (
                    <Image
                      src={card.logo_url}
                      alt={card.business_name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-2xl text-blue-600">🏢</span>
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {card.business_name}
                    </h3>
                    <p className="text-sm text-gray-500">{card.email}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Created: {new Date(card.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Create Business Card Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Business Card
                </h3>
                <form onSubmit={handleCreateBusinessCard}>
                  <div className="space-y-4">
                    {/* Business Info */}
                    <div className="border-b pb-4">
                      <h4 className="font-medium text-gray-700 mb-3">
                        Business Information
                      </h4>
                      <div className="space-y-3">
                        <Input
                          label="Business Name"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          required
                          placeholder="Enter business name"
                        />
                        <Input
                          label="Email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="business@example.com"
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setLogoFile(e.target.files?.[0] || null)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Branches */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Branches</h4>
                        <Button
                          type="button"
                          onClick={addBranch}
                          variant="outline"
                          className="text-sm"
                        >
                          + Add Branch
                        </Button>
                      </div>

                      {branches.map((branch, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 mb-3 bg-gray-50"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-gray-600">
                              Branch {index + 1}
                            </span>
                            {branches.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBranch(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Branch Name"
                              value={branch.branch_name}
                              onChange={(e) =>
                                updateBranch(
                                  index,
                                  "branch_name",
                                  e.target.value
                                )
                              }
                              placeholder="Main Office"
                            />
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                State
                              </label>
                              <select
                                value={branch.state}
                                onChange={(e) =>
                                  updateBranch(index, "state", e.target.value)
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select State</option>
                                {US_STATES.map((state) => (
                                  <option key={state} value={state}>
                                    {state}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Input
                              label="Address"
                              value={branch.address}
                              onChange={(e) =>
                                updateBranch(index, "address", e.target.value)
                              }
                              placeholder="123 Main St"
                              className="col-span-2"
                            />
                            <Input
                              label="Email"
                              type="email"
                              value={branch.email}
                              onChange={(e) =>
                                updateBranch(index, "email", e.target.value)
                              }
                              placeholder="branch@example.com"
                              className="col-span-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-6">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                        setError(null);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      variant="primary"
                    >
                      {isCreating ? "Creating..." : "Create Business Card"}
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
