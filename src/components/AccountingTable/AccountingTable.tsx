"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { AccountingEntry } from "@/types/accounting.types";
import TakeFeeModal from "./TakeFeeModal";

interface AccountingTableProps {
  transactionId?: number; // Optional - if not provided, shows all entries for exchange
  exchangeId?: number; // If provided, filter entries for this exchange
  taxAccountId?: number; // Tax account ID of exchange owner (for fees)
  onEntryChange?: () => void;
}

export default function AccountingTable({
  transactionId,
  exchangeId,
  taxAccountId,
  onEntryChange,
}: AccountingTableProps) {
  const supabase = getSupabaseClient();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    credit: string;
    debit: string;
    description: string;
  }>({ credit: "", debit: "", description: "" });
  const [showTakeFeeModal, setShowTakeFeeModal] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("accounting_entries")
        .select(
          `
          *,
          from_exchange:from_exchange_id (id, exchange_number),
          to_exchange:to_exchange_id (id, exchange_number),
          transaction:transaction_id (id, transaction_number),
          task:task_id (id, title, status)
        `
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      // Filter by transaction if provided
      if (transactionId) {
        query = query.eq("transaction_id", transactionId);
      }

      // If exchangeId provided, filter by to_exchange_id OR from_exchange_id
      if (exchangeId) {
        query = query.or(
          `to_exchange_id.eq.${exchangeId},from_exchange_id.eq.${exchangeId}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries((data || []) as AccountingEntry[]);
    } catch (err) {
      console.error("Failed to load accounting entries:", err);
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [transactionId, exchangeId, supabase]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const startEditing = (entry: AccountingEntry) => {
    setEditingId(entry.id);
    setEditValues({
      credit: entry.credit.toString(),
      debit: entry.debit.toString(),
      description: entry.description || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ credit: "", debit: "", description: "" });
  };

  const handleUpdate = async (entryId: number) => {
    try {
      const { error } = await supabase
        .from("accounting_entries")
        .update({
          credit: parseFloat(editValues.credit) || 0,
          debit: parseFloat(editValues.debit) || 0,
          description: editValues.description || null,
        })
        .eq("id", entryId);

      if (error) throw error;

      await loadEntries();
      cancelEditing();
      onEntryChange?.();
    } catch (err) {
      console.error("Failed to update entry:", err);
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm("Delete this accounting entry?")) return;

    try {
      const { error } = await supabase
        .from("accounting_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      await loadEntries();
      onEntryChange?.();
    } catch (err) {
      console.error("Failed to delete entry:", err);
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const totalCredit = entries.reduce(
    (sum, entry) => sum + (entry.credit || 0),
    0
  );
  const totalDebit = entries.reduce(
    (sum, entry) => sum + (entry.debit || 0),
    0
  );

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading accounting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Accounting</h2>
        {exchangeId && taxAccountId && (
          <Button onClick={() => setShowTakeFeeModal(true)} variant="primary">
            Take Fee
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="p-6">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No accounting entries yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {exchangeId ? (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                  ) : (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Exchange
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  {!exchangeId && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Exchange
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => {
                  const isEditing = editingId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      {exchangeId ? (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {entry.transaction?.transaction_number || "—"}
                        </td>
                      ) : (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {entry.to_exchange?.exchange_number || "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.credit}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                credit: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        ) : (
                          <span className="text-green-600 font-medium">
                            {entry.credit > 0
                              ? `$${entry.credit.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.description}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                description: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          entry.description || "—"
                        )}
                      </td>
                      {!exchangeId && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {entry.from_exchange?.exchange_number || "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.debit}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                debit: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        ) : (
                          <span className="text-red-600 font-medium">
                            {entry.debit > 0
                              ? `$${entry.debit.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleUpdate(entry.id)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              ✓ Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              ✕ Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEditing(entry)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-sm font-bold text-gray-900"
                  >
                    TOTALS:
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-green-600">
                    $
                    {totalCredit.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-sm font-bold text-right text-red-600">
                    $
                    {totalDebit.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-2 text-sm font-bold text-gray-900"
                  >
                    BALANCE:
                  </td>
                  <td
                    colSpan={exchangeId ? 4 : 5}
                    className="px-4 py-2 text-sm font-bold text-right"
                  >
                    <span
                      className={
                        totalCredit - totalDebit >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      $
                      {Math.abs(totalCredit - totalDebit).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                      {totalCredit - totalDebit >= 0 ? " (Credit)" : " (Debit)"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Take Fee Modal */}
      {showTakeFeeModal && exchangeId && taxAccountId && (
        <TakeFeeModal
          exchangeId={exchangeId}
          taxAccountId={taxAccountId}
          onClose={() => setShowTakeFeeModal(false)}
          onSuccess={() => {
            setShowTakeFeeModal(false);
            loadEntries();
            onEntryChange?.();
          }}
        />
      )}
    </div>
  );
}
