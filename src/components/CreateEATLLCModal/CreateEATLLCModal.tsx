"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { createEATLLC, getUSStates } from "@/lib/eat-llc";
import { getSupabaseClient } from "@/lib/supabase";
import type { USState } from "@/types/eat.types";

interface AdminUser {
  id: string; // UUID from user_profiles
  email: string;
  role_type: string;
}

interface CreateEATLLCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateEATLLCModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateEATLLCModalProps) {
  const supabase = getSupabaseClient();
  
  const [companyName, setCompanyName] = useState("");
  const [stateFormation, setStateFormation] = useState("");
  const [dateFormation, setDateFormation] = useState("");
  const [licensedIn, setLicensedIn] = useState("");
  const [ein, setEin] = useState("");
  const [registeredAgent, setRegisteredAgent] = useState("");
  const [registeredAgentAddress, setRegisteredAgentAddress] = useState("");
  
  const [selectedUserProfileIds, setSelectedUserProfileIds] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [states, setStates] = useState<USState[]>([]);
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStates();
      loadProfiles();
      // Set default date to today
      setDateFormation(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const loadStates = async () => {
    const data = await getUSStates();
    setStates(data);
  };

  const loadProfiles = async () => {
    // Load only admin users from user_profiles table
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, role_type")
      .in("role_type", ["workspace_owner", "platform_super_admin", "admin"])
      .order("email");

    if (error) {
      console.error("Failed to load admin users:", error);
      setAdminUsers([]);
      return;
    }

    setAdminUsers(data || []);
  };

  const toggleUserProfile = (userProfileId: string) => {
    setSelectedUserProfileIds(prev => 
      prev.includes(userProfileId)
        ? prev.filter(id => id !== userProfileId)
        : [...prev, userProfileId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      if (!companyName.trim()) {
        throw new Error("Company name is required");
      }
      if (!stateFormation) {
        throw new Error("State of formation is required");
      }
      if (!dateFormation) {
        throw new Error("Date of formation is required");
      }

      const result = await createEATLLC({
        company_name: companyName.trim(),
        state_formation: stateFormation,
        date_formation: dateFormation,
        licensed_in: licensedIn || undefined,
        ein: ein.trim() || undefined,
        registered_agent: registeredAgent.trim() || undefined,
        registered_agent_address: registeredAgentAddress.trim() || undefined,
        user_profile_ids: selectedUserProfileIds.length > 0 ? selectedUserProfileIds : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create EAT LLC");
      }

      setSuccess("EAT LLC created successfully!");
      
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to create EAT LLC:", err);
      setError(err instanceof Error ? err.message : "Failed to create EAT LLC");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setCompanyName("");
    setStateFormation("");
    setDateFormation("");
    setLicensedIn("");
    setEin("");
    setRegisteredAgent("");
    setRegisteredAgentAddress("");
    setSelectedUserProfileIds([]);
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  // Popular states first, then all others
  const popularStates = states.filter(s => s.is_popular_for_llc);
  const otherStates = states.filter(s => !s.is_popular_for_llc);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Create EAT LLC
            </h2>
            <button
              onClick={handleClose}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="e.g., Accommodator Holdings LLC"
              />
              <p className="mt-1 text-xs text-gray-500">
                Full legal name of the EAT LLC
              </p>
            </div>

            {/* State Formation */}
            <div>
              <label htmlFor="stateFormation" className="block text-sm font-medium text-gray-700 mb-2">
                State of Formation *
              </label>
              <select
                id="stateFormation"
                value={stateFormation}
                onChange={(e) => setStateFormation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select state...</option>
                {popularStates.length > 0 && (
                  <>
                    <optgroup label="Popular for LLC">
                      {popularStates.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All States">
                      {otherStates.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                State where LLC is registered
              </p>
            </div>

            {/* Date of Formation */}
            <div>
              <label htmlFor="dateFormation" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Formation *
              </label>
              <input
                type="date"
                id="dateFormation"
                value={dateFormation}
                onChange={(e) => setDateFormation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Licensed In */}
            <div>
              <label htmlFor="licensedIn" className="block text-sm font-medium text-gray-700 mb-2">
                Licensed In (Optional)
              </label>
              <select
                id="licensedIn"
                value={licensedIn}
                onChange={(e) => setLicensedIn(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select state...</option>
                {states.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                State where LLC is licensed to do business
              </p>
            </div>

            {/* EIN (Optional) */}
            <div>
              <label htmlFor="ein" className="block text-sm font-medium text-gray-700 mb-2">
                EIN - Tax ID (Optional)
              </label>
              <input
                type="text"
                id="ein"
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="XX-XXXXXXX"
                pattern="\d{2}-\d{7}"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: XX-XXXXXXX (e.g., 12-3456789)
              </p>
            </div>

            {/* Add Profile Access */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Profile Access (Optional)
              </label>
              <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                {adminUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No admin users available</p>
                ) : (
                  <div className="space-y-2">
                    {adminUsers.map((admin) => (
                      <label
                        key={admin.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserProfileIds.includes(admin.id)}
                          onChange={() => toggleUserProfile(admin.id)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {admin.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Role: {admin.role_type}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Select <strong>admin users only</strong> who will have signing authority for this EAT LLC
              </p>
              {selectedUserProfileIds.length > 0 && (
                <p className="mt-1 text-xs text-blue-600">
                  {selectedUserProfileIds.length} admin{selectedUserProfileIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Registered Agent (Optional - Advanced) */}
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Advanced Options (Optional)
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="registeredAgent" className="block text-sm font-medium text-gray-700 mb-2">
                    Registered Agent
                  </label>
                  <input
                    type="text"
                    id="registeredAgent"
                    value={registeredAgent}
                    onChange={(e) => setRegisteredAgent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Agent name"
                  />
                </div>

                <div>
                  <label htmlFor="registeredAgentAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Registered Agent Address
                  </label>
                  <textarea
                    id="registeredAgentAddress"
                    value={registeredAgentAddress}
                    onChange={(e) => setRegisteredAgentAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Full address"
                  />
                </div>
              </div>
            </details>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={creating}
                variant="primary"
                className="flex-1"
              >
                {creating ? "Creating..." : "Create EAT LLC"}
              </Button>
              <Button
                type="button"
                onClick={handleClose}
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
  );
}

