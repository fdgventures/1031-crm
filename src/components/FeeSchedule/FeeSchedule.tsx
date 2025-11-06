"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";

interface FeeSchedule {
  id: number;
  tax_account_id: number;
  fee_template_id: number | null;
  name: string;
  price: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface FeeChangeHistory {
  id: number;
  fee_schedule_id: number;
  old_price: number;
  new_price: number;
  comment: string;
  changed_by: string | null;
  changed_at: string;
  user_email?: string;
}

interface FeeScheduleProps {
  taxAccountId: number;
  isAdmin: boolean;
}

export default function FeeSchedule({
  taxAccountId,
  isAdmin,
}: FeeScheduleProps) {
  const supabase = getSupabaseClient();
  const [fees, setFees] = useState<FeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeSchedule | null>(null);
  const [editFeePrice, setEditFeePrice] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editing, setEditing] = useState(false);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedFeeHistory, setSelectedFeeHistory] = useState<
    FeeChangeHistory[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadFees = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("fee_schedules")
        .select("*")
        .eq("tax_account_id", taxAccountId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      setFees(data || []);
    } catch (err) {
      console.error("Failed to load fees:", err);
      setError(err instanceof Error ? err.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [supabase, taxAccountId]);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

  const openEditModal = (fee: FeeSchedule) => {
    setEditingFee(fee);
    setEditFeePrice(fee.price.toString());
    setEditComment("");
    setShowEditModal(true);
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEditing(true);

    try {
      if (!editingFee || !editFeePrice) {
        throw new Error("Price is required");
      }

      const newPrice = parseFloat(editFeePrice);
      if (isNaN(newPrice) || newPrice < 0) {
        throw new Error("Price must be a positive number");
      }

      // Check if price has changed
      if (newPrice === editingFee.price) {
        throw new Error("Price has not changed");
      }

      if (!editComment.trim()) {
        throw new Error("Comment is required when changing price");
      }

      // Update price - this will trigger automatic history creation
      const { error: updateError } = await supabase
        .from("fee_schedules")
        .update({ price: newPrice })
        .eq("id", editingFee.id);

      if (updateError) throw updateError;

      // Wait a bit for the trigger to create the history record
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now update the comment in the latest history record
      const { data: historyData, error: historyFetchError } = await supabase
        .from("fee_change_history")
        .select("*")
        .eq("fee_schedule_id", editingFee.id)
        .order("changed_at", { ascending: false })
        .limit(1)
        .single();

      if (!historyFetchError && historyData) {
        // Update comment in the latest history record
        const { error: commentUpdateError } = await supabase
          .from("fee_change_history")
          .update({ comment: editComment })
          .eq("id", historyData.id);

        if (commentUpdateError) {
          console.error("Failed to update comment:", commentUpdateError);
        }
      }

      setSuccess("Fee updated successfully!");
      setShowEditModal(false);
      setEditingFee(null);
      setEditComment("");
      await loadFees();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update fee:", err);
      setError(err instanceof Error ? err.message : "Failed to update fee");
    } finally {
      setEditing(false);
    }
  };

  const openHistoryModal = async (fee: FeeSchedule) => {
    setShowHistoryModal(true);
    setLoadingHistory(true);

    try {
      // First, get the history records
      const { data: historyData, error: fetchError } = await supabase
        .from("fee_change_history")
        .select("*")
        .eq("fee_schedule_id", fee.id)
        .order("changed_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data and get user emails
      const historyWithEmails = await Promise.all(
        (historyData || []).map(async (item: Omit<FeeChangeHistory, 'user_email'>) => {
          let userEmail = "Unknown";
          
          if (item.changed_by) {
            try {
              // Get user email from user_profiles
              const { data: userProfile, error: userError } = await supabase
                .from("user_profiles")
                .select("email")
                .eq("id", item.changed_by)
                .single();
              
              if (!userError && userProfile?.email) {
                userEmail = userProfile.email;
              }
            } catch (err) {
              // Silently handle error
            }
          }

          return {
            ...item,
            user_email: userEmail,
          };
        })
      );

      setSelectedFeeHistory(historyWithEmails);
    } catch (err) {
      console.error("Failed to load fee history:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load fee history"
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Fee Schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Schedule</h2>
          <p className="text-sm text-gray-500 mt-1">
            QI service fees
          </p>
        </div>
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

      {fees.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No Fee Schedule</p>
          <p className="text-sm">Fees will be created automatically when Tax Account is created</p>
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
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fees.map((fee) => (
                <tr key={fee.id}>
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
                    <div className="text-sm text-gray-500 max-w-xs">
                      {fee.description || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(fee.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openHistoryModal(fee)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        📜 History
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openEditModal(fee)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ✏️ Change Price
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Change Fee Price
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFee(null);
                    setEditComment("");
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateFee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fee Name
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                    {editingFee.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Price
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                    ${editingFee.price.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="editFeePrice"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New Price ($) *
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
                    htmlFor="editComment"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Reason for Change *
                  </label>
                  <textarea
                    id="editComment"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    rows={3}
                    placeholder="Please specify the reason for price change..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Comment is required and will be visible to all administrators
                  </p>
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
                      setEditComment("");
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

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Fee Change History
                </h2>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedFeeHistory([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading history...</p>
                </div>
              ) : selectedFeeHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">No Change History</p>
                  <p className="text-sm">Fee price has not been changed yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedFeeHistory.map((historyItem) => (
                    <div
                      key={historyItem.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {historyItem.user_email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(
                                historyItem.changed_at
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">
                              ${historyItem.old_price.toFixed(2)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 font-medium">
                              ${historyItem.new_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            historyItem.new_price > historyItem.old_price
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {historyItem.new_price > historyItem.old_price
                            ? "↑ Increase"
                            : "↓ Decrease"}
                        </div>
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Reason for change:
                        </p>
                        <p className="text-sm text-gray-700">
                          {historyItem.comment || "No comment provided"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedFeeHistory([]);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

