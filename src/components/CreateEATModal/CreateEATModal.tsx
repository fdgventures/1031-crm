"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import {
  createEATParkedFile,
  getEATLLCsForSelection,
  getTaxAccountsForSelection,
} from "@/lib/eat-parked-files";
import { getUSStates } from "@/lib/eat-llc";
import type { USState } from "@/types/eat.types";

interface CreateEATModalProps {
  onClose: () => void;
  onSuccess: (id: number) => void;
}

export default function CreateEATModal({
  onClose,
  onSuccess,
}: CreateEATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [eatName, setEatName] = useState("");
  const [selectedEATLLC, setSelectedEATLLC] = useState<number | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [dateOfFormation, setDateOfFormation] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedExchangors, setSelectedExchangors] = useState<number[]>([]);

  // Options
  const [eatLLCs, setEatLLCs] = useState<
    Array<{
      id: number;
      company_name: string;
      state_formation: string;
      licensed_in: string | null;
    }>
  >([]);
  const [states, setStates] = useState<USState[]>([]);
  const [taxAccounts, setTaxAccounts] = useState<
    Array<{
      id: number;
      name: string;
      account_number: string | null;
    }>
  >([]);

  // Licensed states for selected EAT LLC
  const [licensedStates, setLicensedStates] = useState<string[]>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    // Update licensed states when EAT LLC is selected
    if (selectedEATLLC) {
      const selectedLLC = eatLLCs.find((llc) => llc.id === selectedEATLLC);
      if (selectedLLC) {
        const states = [selectedLLC.state_formation];
        if (selectedLLC.licensed_in) {
          states.push(selectedLLC.licensed_in);
        }
        setLicensedStates(states);
        // Auto-select first licensed state
        if (states.length > 0 && !selectedState) {
          setSelectedState(states[0]);
        }
      }
    }
  }, [selectedEATLLC, eatLLCs, selectedState]);

  const loadOptions = async () => {
    const [llcs, statesList, accounts] = await Promise.all([
      getEATLLCsForSelection(),
      getUSStates(),
      getTaxAccountsForSelection(),
    ]);

    setEatLLCs(llcs);
    setStates(statesList);
    setTaxAccounts(accounts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!eatName.trim()) {
      setError("Please enter EAT name");
      return;
    }
    if (!selectedEATLLC) {
      setError("Please select EAT LLC");
      return;
    }
    if (!selectedState) {
      setError("Please select state");
      return;
    }
    if (!dateOfFormation) {
      setError("Please select date of formation");
      return;
    }
    if (selectedExchangors.length === 0) {
      setError("Please add at least one exchangor");
      return;
    }

    setLoading(true);
    setSubmitting(true);

    const result = await createEATParkedFile({
      eat_name: eatName,
      eat_llc_id: selectedEATLLC,
      state: selectedState,
      date_of_formation: dateOfFormation,
      exchangor_tax_account_ids: selectedExchangors,
    });

    setLoading(false);
    setSubmitting(false);

    if (result.success && result.id) {
      onSuccess(result.id);
    } else {
      setError(result.error || "Error creating EAT");
    }
  };

  const handleAddExchangor = (taxAccountId: number) => {
    if (!selectedExchangors.includes(taxAccountId)) {
      setSelectedExchangors([...selectedExchangors, taxAccountId]);
    }
  };

  const handleRemoveExchangor = (taxAccountId: number) => {
    setSelectedExchangors(
      selectedExchangors.filter((id) => id !== taxAccountId)
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create EAT</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={submitting}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div>
              <label
                htmlFor="eatName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Company Name *
              </label>
              <input
                id="eatName"
                type="text"
                value={eatName}
                onChange={(e) => setEatName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
                required
                disabled={loading}
              />
            </div>

            {/* Select EAT LLC */}
            <div>
              <label
                htmlFor="eatLLC"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select EAT LLC *
              </label>
              <select
                id="eatLLC"
                value={selectedEATLLC || ""}
                onChange={(e) =>
                  setSelectedEATLLC(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              >
                <option value="">Select EAT LLC...</option>
                {eatLLCs.map((llc) => (
                  <option key={llc.id} value={llc.id}>
                    {llc.company_name} ({llc.state_formation})
                  </option>
                ))}
              </select>
              {eatLLCs.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  Create EAT LLC in admin panel first
                </p>
              )}
            </div>

            {/* Select State */}
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select State *
              </label>
              <select
                id="state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!selectedEATLLC || loading}
              >
                <option value="">
                  {selectedEATLLC
                    ? "Select state..."
                    : "Select EAT LLC first"}
                </option>
                {selectedEATLLC &&
                  licensedStates.map((stateCode) => {
                    const state = states.find((s) => s.code === stateCode);
                    return (
                      <option key={stateCode} value={stateCode}>
                        {state ? `${state.name} (${state.code})` : stateCode}
                      </option>
                    );
                  })}
              </select>
              {selectedEATLLC && licensedStates.length > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  EAT LLC Licensed in: {licensedStates.join(", ")}
                </p>
              )}
            </div>

            {/* Date of Formation */}
            <div>
              <label
                htmlFor="dateOfFormation"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Date of Formation *
              </label>
              <input
                id="dateOfFormation"
                type="date"
                value={dateOfFormation}
                onChange={(e) => setDateOfFormation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            {/* Add Exchangor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Exchangor *
              </label>
              <div className="flex gap-2">
                <select
                  id="exchangorSelect"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddExchangor(parseInt(e.target.value));
                      e.target.value = "";
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Select Tax Account...</option>
                  {taxAccounts
                    .filter((acc) => !selectedExchangors.includes(acc.id))
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                        {account.account_number && ` (${account.account_number})`}
                      </option>
                    ))}
                </select>
              </div>

              {/* Selected Exchangors */}
              {selectedExchangors.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedExchangors.map((id) => {
                    const account = taxAccounts.find((acc) => acc.id === id);
                    if (!account) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {account.name}
                          </p>
                          {account.account_number && (
                            <p className="text-sm text-gray-600">
                              {account.account_number}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExchangor(id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create EAT"}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
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

