"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

interface Fee {
  id: number;
  name: string;
  amount: number;
  description?: string | null;
}

interface TakeFeeModalProps {
  exchangeId: number;
  taxAccountId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TakeFeeModal({
  exchangeId,
  taxAccountId,
  onClose,
  onSuccess,
}: TakeFeeModalProps) {
  const supabase = getSupabaseClient();
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      setLoading(true);
      
      // Load fee schedules for this tax account
      const { data, error: loadError } = await supabase
        .from("fee_schedules")
        .select("*")
        .eq("tax_account_id", taxAccountId)
        .order("name");

      if (loadError) throw loadError;

      setFees((data || []) as Fee[]);
      
      if (data && data.length > 0) {
        setSelectedFeeId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load fees:", err);
      setError(err instanceof Error ? err.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  };

  const handleTakeFee = async () => {
    if (!selectedFeeId) {
      setError("Please select a fee");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const selectedFee = fees.find(f => f.id === selectedFeeId);
      if (!selectedFee) {
        throw new Error("Fee not found");
      }

      // Create accounting entry
      const { error: insertError } = await supabase
        .from("accounting_entries")
        .insert({
          date: new Date().toISOString().split('T')[0],
          debit: selectedFee.amount,
          credit: 0,
          description: `Fee: ${selectedFee.name}${selectedFee.description ? ` - ${selectedFee.description}` : ''}`,
          entry_type: 'fees',
          from_exchange_id: exchangeId,
          to_exchange_id: null,
          transaction_id: null,
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to take fee:", err);
      setError(err instanceof Error ? err.message : "Failed to take fee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Take Fee</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select a fee to deduct from this exchange
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading fees...</p>
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No fees found for this tax account.</p>
              <p className="text-sm text-gray-500 mt-2">
                Please add fee schedules in the tax account settings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => (
                <button
                  key={fee.id}
                  onClick={() => setSelectedFeeId(fee.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedFeeId === fee.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectedFeeId === fee.id}
                          onChange={() => setSelectedFeeId(fee.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{fee.name}</div>
                          {fee.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              {fee.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-gray-900">
                        ${fee.amount.toLocaleString('en-US', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <Button onClick={onClose} variant="outline" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleTakeFee}
            variant="primary"
            disabled={loading || fees.length === 0 || !selectedFeeId || saving}
          >
            {saving ? "Processing..." : "Take Fee"}
          </Button>
        </div>
      </div>
    </div>
  );
}

