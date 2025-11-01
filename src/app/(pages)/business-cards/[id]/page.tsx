"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  updated_at: string;
}

interface Branch {
  id: number;
  branch_name: string;
  state: string;
  address: string;
  email: string;
  created_at: string;
}

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Employee {
  id: number;
  profile: Profile;
  branch: Branch | null;
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

export default function BusinessCardViewPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { id } = params;
  const supabase = getSupabaseClient();
  const businessCardId = Number.parseInt(id, 10);
  const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit business card modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add branch modal
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branch_name: "",
    state: "",
    address: "",
    email: "",
  });
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Add employee modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null
  );
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  const loadBusinessCard = useCallback(async () => {
    try {
      // Load business card
      const { data: cardData, error: cardError } = await supabase
        .from("business_cards")
        .select("*")
        .eq("id", id)
        .single();

      if (cardError) throw cardError;
      setBusinessCard(cardData);

      // Load branches
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .eq("business_card_id", id)
        .order("created_at", { ascending: true });

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);

      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("business_card_employees")
        .select(
          `
          id,
          profile:profile_id (id, first_name, last_name, email),
          branch:branch_id (id, branch_name, state, address, email)
        `
        )
        .eq("business_card_id", id);

      if (employeesError) throw employeesError;

      // Transform data to match Employee interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedEmployees = (employeesData || []).map((emp: any) => ({
        id: emp.id,
        profile: Array.isArray(emp.profile) ? emp.profile[0] : emp.profile,
        branch: emp.branch
          ? Array.isArray(emp.branch)
            ? emp.branch[0]
            : emp.branch
          : null,
      })) as Employee[];

      setEmployees(transformedEmployees);
    } catch (err) {
      console.error("Failed to load business card:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load business card"
      );
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  const checkAdminAndLoadBusinessCard = useCallback(async () => {
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

      await loadBusinessCard();
    } catch (err) {
      console.error("Error checking admin:", err);
      setLoading(false);
    }
  }, [loadBusinessCard, supabase]);

  useEffect(() => {
    void checkAdminAndLoadBusinessCard();
  }, [checkAdminAndLoadBusinessCard]);

  const openEditModal = () => {
    if (businessCard) {
      setEditBusinessName(businessCard.business_name);
      setEditEmail(businessCard.email);
      setShowEditModal(true);
    }
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

  const handleUpdateBusinessCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsUpdating(true);

    try {
      let logoUrl = businessCard?.logo_url || null;

      if (editLogoFile) {
        logoUrl = await uploadLogo(editLogoFile);
        if (!logoUrl) {
          throw new Error("Failed to upload logo");
        }
      }

      const { error } = await supabase
        .from("business_cards")
        .update({
          business_name: editBusinessName,
          email: editEmail,
          logo_url: logoUrl,
        })
        .eq("id", id);

      if (error) throw error;

      setSuccess("Business card updated successfully!");
      setShowEditModal(false);
      setEditLogoFile(null);
      await loadBusinessCard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update business card"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreatingBranch(true);

    try {
      if (Number.isNaN(businessCardId)) {
        throw new Error("Invalid business card id");
      }

      const { error } = await supabase.from("branches").insert([
        {
          business_card_id: businessCardId,
          ...newBranch,
        },
      ]);

      if (error) throw error;

      setSuccess("Branch created successfully!");
      setShowAddBranchModal(false);
      setNewBranch({
        branch_name: "",
        state: "",
        address: "",
        email: "",
      });
      await loadBusinessCard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const openAddEmployeeModal = async () => {
    try {
      // Load all profiles
      const { data, error } = await supabase
        .from("profile")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setAvailableProfiles(data || []);
      setShowAddEmployeeModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsAddingEmployee(true);

    try {
      if (!selectedProfileId) {
        throw new Error("Please select an employee");
      }

      if (Number.isNaN(businessCardId)) {
        throw new Error("Invalid business card id");
      }

      const { error } = await supabase.from("business_card_employees").insert([
        {
          business_card_id: businessCardId,
          profile_id: selectedProfileId,
          branch_id: selectedBranchId,
        },
      ]);

      if (error) throw error;

      setSuccess("Employee added successfully!");
      setShowAddEmployeeModal(false);
      setSelectedProfileId(null);
      setSelectedBranchId(null);
      await loadBusinessCard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setIsAddingEmployee(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business card...</p>
        </div>
      </div>
    );
  }

  if (error || !businessCard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Business Card
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "Business card not found"}
            </p>
            <Button
              onClick={() => router.push("/business-cards")}
              variant="primary"
            >
              Back to Business Cards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Button
            onClick={() => router.push("/business-cards")}
            variant="outline"
          >
            ← Back to Business Cards
          </Button>
          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={openEditModal} variant="outline">
                ✏️ Edit
              </Button>
              <Button
                onClick={() => setShowAddBranchModal(true)}
                variant="outline"
              >
                + Branch
              </Button>
              <Button onClick={openAddEmployeeModal} variant="primary">
                + Employee
              </Button>
            </div>
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

        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 rounded-t-lg">
            <div className="flex items-center">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mr-6 overflow-hidden">
                {businessCard.logo_url ? (
                  <Image
                    src={businessCard.logo_url}
                    alt={businessCard.business_name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl font-bold text-blue-600">🏢</span>
                )}
              </div>
              <div className="text-white">
                <h1 className="text-4xl font-bold">
                  {businessCard.business_name}
                </h1>
                <p className="text-blue-100 mt-2">{businessCard.email}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8">
            {/* Branches Section */}
            {branches.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Branches ({branches.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {branch.branch_name}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            State:
                          </span>
                          <span className="ml-2 text-gray-600">
                            {branch.state}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Address:
                          </span>
                          <span className="ml-2 text-gray-600">
                            {branch.address}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Email:
                          </span>
                          <span className="ml-2 text-gray-600">
                            {branch.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {branches.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No branches added yet</p>
              </div>
            )}

            {/* Employees Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Employees ({employees.length})
              </h2>
              {employees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-center mb-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-lg font-bold text-blue-600">
                            {employee.profile.first_name.charAt(0)}
                            {employee.profile.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {employee.profile.first_name}{" "}
                            {employee.profile.last_name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {employee.profile.email || "No email"}
                          </p>
                        </div>
                      </div>
                      {employee.branch && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Branch:</span>{" "}
                            {employee.branch.branch_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.branch.state}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No employees added yet</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500">
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(businessCard.created_at).toLocaleString()}
                </div>
                <div className="mt-2 sm:mt-0">
                  <strong>Updated:</strong>{" "}
                  {new Date(businessCard.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Business Card Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Business Card
                </h3>
                <form onSubmit={handleUpdateBusinessCard}>
                  <div className="space-y-4">
                    <Input
                      label="Business Name"
                      value={editBusinessName}
                      onChange={(e) => setEditBusinessName(e.target.value)}
                      required
                      placeholder="Enter business name"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      placeholder="business@example.com"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo (optional - leave empty to keep current)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setEditLogoFile(e.target.files?.[0] || null)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
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
                        setShowEditModal(false);
                        setEditLogoFile(null);
                        setError(null);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      variant="primary"
                    >
                      {isUpdating ? "Updating..." : "Update"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Branch Modal */}
        {showAddBranchModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New Branch
                </h3>
                <form onSubmit={handleCreateBranch}>
                  <div className="space-y-4">
                    <Input
                      label="Branch Name"
                      value={newBranch.branch_name}
                      onChange={(e) =>
                        setNewBranch({
                          ...newBranch,
                          branch_name: e.target.value,
                        })
                      }
                      required
                      placeholder="Main Office"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <select
                        value={newBranch.state}
                        onChange={(e) =>
                          setNewBranch({ ...newBranch, state: e.target.value })
                        }
                        required
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
                      value={newBranch.address}
                      onChange={(e) =>
                        setNewBranch({ ...newBranch, address: e.target.value })
                      }
                      required
                      placeholder="123 Main St"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={newBranch.email}
                      onChange={(e) =>
                        setNewBranch({ ...newBranch, email: e.target.value })
                      }
                      required
                      placeholder="branch@example.com"
                    />
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
                        setShowAddBranchModal(false);
                        setNewBranch({
                          branch_name: "",
                          state: "",
                          address: "",
                          email: "",
                        });
                        setError(null);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreatingBranch}
                      variant="primary"
                    >
                      {isCreatingBranch ? "Creating..." : "Create Branch"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddEmployeeModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Employee
                </h3>
                <form onSubmit={handleAddEmployee}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Employee *
                      </label>
                      <select
                        value={selectedProfileId || ""}
                        onChange={(e) =>
                          setSelectedProfileId(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Choose profile...</option>
                        {availableProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name}
                            {profile.email && ` (${profile.email})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign to Branch (optional)
                      </label>
                      <select
                        value={selectedBranchId || ""}
                        onChange={(e) =>
                          setSelectedBranchId(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">No branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.branch_name} - {branch.state}
                          </option>
                        ))}
                      </select>
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
                        setShowAddEmployeeModal(false);
                        setSelectedProfileId(null);
                        setSelectedBranchId(null);
                        setError(null);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isAddingEmployee}
                      variant="primary"
                    >
                      {isAddingEmployee ? "Adding..." : "Add Employee"}
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
