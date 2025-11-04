"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";

interface FeeTemplate {
  id: number;
  name: string;
  price: number;
  description: string | null;
  qi_company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function FeeScheduleManager() {
  const supabase = getSupabaseClient();
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeePrice, setNewFeePrice] = useState("");
  const [newFeeDescription, setNewFeeDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeTemplate | null>(null);
  const [editFeeName, setEditFeeName] = useState("");
  const [editFeePrice, setEditFeePrice] = useState("");
  const [editFeeDescription, setEditFeeDescription] = useState("");
  const [editing, setEditing] = useState(false);

  const loadFeeTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("fee_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setFeeTemplates(data || []);
    } catch (err) {
      console.error("Failed to load fee templates:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load fee templates"
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadFeeTemplates();
  }, [loadFeeTemplates]);

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      if (!newFeeName || !newFeePrice) {
        throw new Error("Name and price are required");
      }

      const price = parseFloat(newFeePrice);
      if (isNaN(price) || price < 0) {
        throw new Error("Price must be a positive number");
      }

      const { error: insertError } = await supabase
        .from("fee_templates")
        .insert({
          name: newFeeName,
          price: price,
          description: newFeeDescription || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      setSuccess("Fee template created successfully!");
      setNewFeeName("");
      setNewFeePrice("");
      setNewFeeDescription("");
      setShowCreateModal(false);
      await loadFeeTemplates();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create fee template:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create fee template"
      );
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (fee: FeeTemplate) => {
    setEditingFee(fee);
    setEditFeeName(fee.name);
    setEditFeePrice(fee.price.toString());
    setEditFeeDescription(fee.description || "");
    setShowEditModal(true);
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEditing(true);

    try {
      if (!editingFee || !editFeeName || !editFeePrice) {
        throw new Error("Name and price are required");
      }

      const price = parseFloat(editFeePrice);
      if (isNaN(price) || price < 0) {
        throw new Error("Price must be a positive number");
      }

      const { error: updateError } = await supabase
        .from("fee_templates")
        .update({
          name: editFeeName,
          price: price,
          description: editFeeDescription || null,
        })
        .eq("id", editingFee.id);

      if (updateError) throw updateError;

      setSuccess("Fee template updated successfully!");
      setShowEditModal(false);
      setEditingFee(null);
      await loadFeeTemplates();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update fee template:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update fee template"
      );
    } finally {
      setEditing(false);
    }
  };

  const handleToggleActive = async (fee: FeeTemplate) => {
    try {
      const { error: updateError } = await supabase
        .from("fee_templates")
        .update({ is_active: !fee.is_active })
        .eq("id", fee.id);

      if (updateError) throw updateError;

      setSuccess(
        `Template ${fee.is_active ? "deactivated" : "activated"} successfully!`
      );
      await loadFeeTemplates();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to toggle fee template:", err);
      setError(
        err instanceof Error ? err.message : "Failed to toggle fee template"
      );
    }
  };

  const handleDeleteFee = async (feeId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this Fee template? This action cannot be undone."
      )
    )
      return;

    try {
      const { error: deleteError } = await supabase
        .from("fee_templates")
        .delete()
        .eq("id", feeId);

      if (deleteError) throw deleteError;

      setSuccess("Fee template deleted successfully!");
      await loadFeeTemplates();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to delete fee template:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete fee template"
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Fee templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Fee Template Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage fee templates for Tax Accounts
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="small"
        >
          + Create Fee Template
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

      {feeTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No Fee Templates</p>
          <p className="text-sm">Create your first fee template</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feeTemplates.map((fee) => (
                <tr key={fee.id} className={!fee.is_active ? "opacity-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {fee.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${fee.price.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {fee.description || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        fee.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {fee.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(fee.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(fee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(fee)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {fee.is_active ? "🔒 Deactivate" : "✅ Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteFee(fee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Fee Template
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewFeeName("");
                    setNewFeePrice("");
                    setNewFeeDescription("");
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateFee} className="space-y-4">
                <div>
                  <label
                    htmlFor="feeName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    id="feeName"
                    value={newFeeName}
                    onChange={(e) => setNewFeeName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="e.g. Initial Setup Fee"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feePrice"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    id="feePrice"
                    value={newFeePrice}
                    onChange={(e) => setNewFeePrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feeDescription"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="feeDescription"
                    value={newFeeDescription}
                    onChange={(e) => setNewFeeDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Brief description of the fee..."
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
                      setNewFeeName("");
                      setNewFeePrice("");
                      setNewFeeDescription("");
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

      {/* Edit Modal */}
      {showEditModal && editingFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Fee Template
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFee(null);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateFee} className="space-y-4">
                <div>
                  <label
                    htmlFor="editFeeName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    id="editFeeName"
                    value={editFeeName}
                    onChange={(e) => setEditFeeName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="e.g. Initial Setup Fee"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editFeePrice"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    id="editFeePrice"
                    value={editFeePrice}
                    onChange={(e) => setEditFeePrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editFeeDescription"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="editFeeDescription"
                    value={editFeeDescription}
                    onChange={(e) => setEditFeeDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Brief description of the fee..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={editing}
                    variant="primary"
                    className="flex-1"
                  >
                    {editing ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingFee(null);
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
  );
}

