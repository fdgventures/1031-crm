'use client';

import React, { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { DocumentRepository } from "@/components/document-repository";
import { TaskManager } from "@/components/TaskManager";
import { LogViewer } from "@/components/LogViewer";
import { getEATLLC, updateEATLLC, addProfileAccess, removeProfileAccess, getUSStates } from "@/lib/eat-llc";
import { getSupabaseClient } from "@/lib/supabase";
import type { EATLLCWithAccess, USState } from "@/types/eat.types";

interface AdminUser {
  id: string; // UUID from user_profiles
  email: string;
  role_type: string;
}

export default function EATViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  const [eat, setEat] = useState<EATLLCWithAccess | null>(null);
  const [states, setStates] = useState<USState[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    company_name: "",
    state_formation: "",
    date_formation: "",
    licensed_in: "",
    ein: "",
    status: "Active" as "Active" | "Inactive" | "Dissolved",
  });
  
  // Add admin modal
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedUserProfileId, setSelectedUserProfileId] = useState("");

  useEffect(() => {
    document.title = `EAT LLC | 1031 Exchange CRM`;
  }, []);

  const loadEAT = useCallback(async () => {
    setLoading(true);
    const data = await getEATLLC(parseInt(id));
    if (data) {
      setEat(data);
      document.title = `${data.company_name} | EAT LLCs | 1031 Exchange CRM`;
    }
    setLoading(false);
  }, [id]);

  const loadStates = useCallback(async () => {
    const data = await getUSStates();
    setStates(data);
  }, []);

  const loadAdminUsers = useCallback(async () => {
    // Load admin users from user_profiles
    const { data } = await supabase
      .from("user_profiles")
      .select("id, email, role_type")
      .in("role_type", ["workspace_owner", "platform_super_admin", "admin"])
      .order("email");
    
    setAdminUsers(data || []);
  }, [supabase]);

  useEffect(() => {
    loadEAT();
    loadStates();
    loadAdminUsers();
    setIsAdmin(true); // TODO: Add real admin check
  }, [loadEAT, loadStates, loadAdminUsers]);

  const startEditing = () => {
    if (!eat) return;
    setEditValues({
      company_name: eat.company_name,
      state_formation: eat.state_formation,
      date_formation: eat.date_formation,
      licensed_in: eat.licensed_in || "",
      ein: eat.ein || "",
      status: eat.status,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!eat) return;
    
    const success = await updateEATLLC(eat.id, {
      company_name: editValues.company_name,
      state_formation: editValues.state_formation,
      date_formation: editValues.date_formation,
      licensed_in: editValues.licensed_in || null,
      ein: editValues.ein || null,
      status: editValues.status,
    } as any);

    if (success) {
      await loadEAT();
      setIsEditing(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eat || !selectedUserProfileId) return;

    const success = await addProfileAccess(eat.id, selectedUserProfileId);
    
    if (success) {
      await loadEAT();
      setShowAddAdminModal(false);
      setSelectedUserProfileId("");
    }
  };

  const handleRemoveAdmin = async (userProfileId: string) => {
    if (!eat || !confirm("Remove this admin access?")) return;

    const success = await removeProfileAccess(eat.id, userProfileId);
    
    if (success) {
      await loadEAT();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'dissolved':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading EAT LLC...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!eat) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-red-600">EAT LLC not found</p>
            <Button onClick={() => router.push('/eat')} variant="outline" className="mt-4">
              ← Back to EAT LLCs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get admin users that don't have access yet
  const availableAdmins = adminUsers.filter(
    u => !eat.profile_accesses?.some(a => a.user_profile_id === u.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <Button onClick={() => router.push('/eat')} variant="outline">
            ← Back to EAT LLCs
          </Button>
        </div>

        {/* EAT LLC Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{eat.company_name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {eat.eat_number || 'No EAT number'}
              </p>
            </div>
            {isAdmin && !isEditing && (
              <Button onClick={startEditing} variant="outline">
                ✏️ Edit
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button onClick={saveChanges} variant="primary">
                  Save
                </Button>
                <Button onClick={cancelEditing} variant="outline">
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Company Name */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Company Name</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValues.company_name}
                    onChange={(e) => setEditValues({ ...editValues, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">{eat.company_name}</p>
                )}
              </div>

              {/* State Formation */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">State of Formation</h3>
                {isEditing ? (
                  <select
                    value={editValues.state_formation}
                    onChange={(e) => setEditValues({ ...editValues, state_formation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {states.map(s => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-lg text-gray-900">{eat.state_formation}</p>
                )}
              </div>

              {/* Date Formation */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Date of Formation</h3>
                {isEditing ? (
                  <input
                    type="date"
                    value={editValues.date_formation}
                    onChange={(e) => setEditValues({ ...editValues, date_formation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {new Date(eat.date_formation).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Licensed In */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Licensed In</h3>
                {isEditing ? (
                  <select
                    value={editValues.licensed_in}
                    onChange={(e) => setEditValues({ ...editValues, licensed_in: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Not specified</option>
                    {states.map(s => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-lg text-gray-900">{eat.licensed_in || '—'}</p>
                )}
              </div>

              {/* EIN */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">EIN (Tax ID)</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValues.ein}
                    onChange={(e) => setEditValues({ ...editValues, ein: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="XX-XXXXXXX"
                  />
                ) : (
                  <p className="text-lg text-gray-900">{eat.ein || '—'}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                {isEditing ? (
                  <select
                    value={editValues.status}
                    onChange={(e) => setEditValues({ ...editValues, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Dissolved">Dissolved</option>
                  </select>
                ) : (
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(eat.status)}`}>
                    {eat.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Access Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Admin Access</h2>
            {isAdmin && (
              <Button
                onClick={() => setShowAddAdminModal(true)}
                variant="primary"
                size="small"
              >
                + Add Admin
              </Button>
            )}
          </div>

          <div className="p-6">
            {!eat.profile_accesses || eat.profile_accesses.length === 0 ? (
              <p className="text-gray-500 text-sm">No admins have access yet</p>
            ) : (
              <div className="space-y-3">
                {eat.profile_accesses.map((access: any) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {access.user_profile?.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        Role: {access.user_profile?.role_type}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Access: {access.access_type}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        onClick={() => handleRemoveAdmin(access.user_profile_id)}
                        variant="destructive"
                        size="small"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <DocumentRepository entityType="eat" entityId={id} />
        
        {/* Tasks */}
        <TaskManager
          entityType="eat"
          entityId={parseInt(id)}
          entityName={eat.company_name}
          onLogCreate={() => setLogRefreshTrigger(Date.now())}
        />

        {/* Activity Log */}
        <LogViewer
          entityType="eat"
          entityId={parseInt(id)}
          entityName={eat.company_name}
          refreshTrigger={logRefreshTrigger}
        />

        {/* Add Admin Modal */}
        {showAddAdminModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Add Admin Access
                  </h2>
                  <button
                    onClick={() => setShowAddAdminModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div>
                    <label htmlFor="adminSelect" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Admin *
                    </label>
                    <select
                      id="adminSelect"
                      value={selectedUserProfileId}
                      onChange={(e) => setSelectedUserProfileId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select an admin...</option>
                      {availableAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.email} ({admin.role_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" className="flex-1">
                      Add Access
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowAddAdminModal(false)}
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


















