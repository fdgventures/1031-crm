"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { createSpousalTaxAccount } from "@/lib/spousal-tax-accounts";
import { getSupabaseClient } from "@/lib/supabase";

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface CreateTaxAccountModalWithProfileSelectProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  onSuccess: () => void;
}

type AccountType = "individual" | "spousal";

export default function CreateTaxAccountModalWithProfileSelect({
  isOpen,
  onClose,
  profiles,
  onSuccess,
}: CreateTaxAccountModalWithProfileSelectProps) {
  const supabase = getSupabaseClient();
  
  const [accountType, setAccountType] = useState<AccountType>("individual");
  
  // Individual fields
  const [taxAccountName, setTaxAccountName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  
  // Spousal fields
  const [primaryTaxAccountName, setPrimaryTaxAccountName] = useState("");
  const [primaryBusinessName, setPrimaryBusinessName] = useState("");
  const [spouseProfileId, setSpouseProfileId] = useState<number | null>(null);
  const [spouseTaxAccountName, setSpouseTaxAccountName] = useState("");
  const [spouseBusinessName, setSpouseBusinessName] = useState("");
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-fill spouse name when selected
  useEffect(() => {
    if (spouseProfileId) {
      const spouse = profiles.find(p => p.id === spouseProfileId);
      if (spouse) {
        setSpouseTaxAccountName(`${spouse.first_name} ${spouse.last_name}`);
      }
    }
  }, [spouseProfileId, profiles]);

  // Auto-fill primary name when selected
  useEffect(() => {
    if (selectedProfileId && accountType === "individual") {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        setTaxAccountName(`${profile.first_name} ${profile.last_name}`);
      }
    } else if (selectedProfileId && accountType === "spousal") {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        setPrimaryTaxAccountName(`${profile.first_name} ${profile.last_name}`);
      }
    }
  }, [selectedProfileId, accountType, profiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      if (accountType === "individual") {
        if (!selectedProfileId) {
          throw new Error("Please select a profile");
        }

        // Create individual tax account
        const { data: taxAccount, error: taxAccountError } = await supabase
          .from("tax_accounts")
          .insert({
            name: taxAccountName,
            profile_id: selectedProfileId,
            primary_profile_id: selectedProfileId,
            is_spousal: false,
          })
          .select()
          .single();

        if (taxAccountError) throw taxAccountError;

        // Generate account number
        const { count } = await supabase
          .from("tax_accounts")
          .select("*", { count: "exact", head: true })
          .eq("is_spousal", false);

        const sequenceNumber = ((count ?? 0)).toString().padStart(3, "0");
        
        const { data: profileData } = await supabase
          .from("profile")
          .select("last_name")
          .eq("id", selectedProfileId)
          .single();

        const lastNamePrefix = (profileData?.last_name || "XXX")
          .substring(0, 3)
          .toUpperCase()
          .padEnd(3, "X");
        
        const accountNumber = `INV${lastNamePrefix}${sequenceNumber}`;

        await supabase
          .from("tax_accounts")
          .update({ account_number: accountNumber })
          .eq("id", taxAccount.id);

        // Create business name
        const businessNameToUse = businessName.trim() || taxAccountName;
        await supabase.from("business_names").insert({
          name: businessNameToUse,
          tax_account_id: taxAccount.id,
        });

        // Create fee schedule from templates
        const { data: feeTemplates } = await supabase
          .from("fee_templates")
          .select("*")
          .eq("is_active", true);

        if (feeTemplates && feeTemplates.length > 0) {
          const feeSchedules = feeTemplates.map(template => ({
            tax_account_id: taxAccount.id,
            name: template.name,
            amount: template.amount,
            description: template.description,
          }));
          await supabase.from("fee_schedules").insert(feeSchedules);
        }

        setSuccess("Tax Account created successfully!");
      } else {
        // Create spousal tax account
        if (!selectedProfileId) {
          throw new Error("Please select primary profile");
        }
        if (!spouseProfileId) {
          throw new Error("Please select spouse profile");
        }

        const result = await createSpousalTaxAccount({
          primaryProfileId: selectedProfileId,
          primaryTaxAccountName: primaryTaxAccountName,
          primaryBusinessName: primaryBusinessName,
          spouseProfileId: spouseProfileId,
          spouseTaxAccountName: spouseTaxAccountName,
          spouseBusinessName: spouseBusinessName,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create spousal tax account");
        }

        setSuccess("Spousal Tax Account created successfully!");
      }

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to create tax account:", err);
      setError(err instanceof Error ? err.message : "Failed to create tax account");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setAccountType("individual");
    setTaxAccountName("");
    setBusinessName("");
    setSelectedProfileId(null);
    setPrimaryTaxAccountName("");
    setPrimaryBusinessName("");
    setSpouseProfileId(null);
    setSpouseTaxAccountName("");
    setSpouseBusinessName("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  // Filter profiles for spouse dropdown (exclude selected primary)
  const availableSpouses = selectedProfileId 
    ? profiles.filter(p => p.id !== selectedProfileId)
    : profiles;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Create Tax Account
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
            {/* Account Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setAccountType("individual")}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    accountType === "individual"
                      ? "bg-white text-blue-600 shadow"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("spousal")}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    accountType === "spousal"
                      ? "bg-white text-blue-600 shadow"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Spousal/Joint
                </button>
              </div>
            </div>

            {accountType === "individual" ? (
              /* Individual Tax Account Fields */
              <>
                <div>
                  <label htmlFor="taxAccountName" className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Account Name *
                  </label>
                  <input
                    type="text"
                    id="taxAccountName"
                    value={taxAccountName}
                    onChange={(e) => setTaxAccountName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Enter tax account name"
                  />
                </div>

                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use Tax Account Name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    If empty, a Business Name will be created with the same name as the Tax Account
                  </p>
                </div>

                <div>
                  <label htmlFor="profileSelect" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Profile *
                  </label>
                  <select
                    id="profileSelect"
                    value={selectedProfileId || ""}
                    onChange={(e) => setSelectedProfileId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a profile...</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name} ({profile.email})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              /* Spousal Tax Account Fields */
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Spousal/Joint Tax Account:</strong> This will create one tax account visible to both spouses. Both profiles will have access to this account.
                  </p>
                </div>

                {/* Primary Profile Block */}
                <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/30">
                  <h3 className="text-sm font-semibold text-blue-900 mb-4">
                    Primary Owner
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="primaryProfile" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Profile *
                      </label>
                      <select
                        id="primaryProfile"
                        value={selectedProfileId || ""}
                        onChange={(e) => setSelectedProfileId(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select primary owner...</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name} ({profile.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="primaryTaxAccountName" className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Account Name *
                      </label>
                      <input
                        type="text"
                        id="primaryTaxAccountName"
                        value={primaryTaxAccountName}
                        onChange={(e) => setPrimaryTaxAccountName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="primaryBusinessName" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name (Optional)
                      </label>
                      <input
                        type="text"
                        id="primaryBusinessName"
                        value={primaryBusinessName}
                        onChange={(e) => setPrimaryBusinessName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., John Smith"
                      />
                    </div>
                  </div>
                </div>

                {/* Spouse Profile Block */}
                <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50/30">
                  <h3 className="text-sm font-semibold text-purple-900 mb-4">
                    Spouse
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="spouseProfile" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Spouse *
                      </label>
                      <select
                        id="spouseProfile"
                        value={spouseProfileId || ""}
                        onChange={(e) => setSpouseProfileId(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select spouse...</option>
                        {availableSpouses.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name} ({profile.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="spouseTaxAccountName" className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Account Name *
                      </label>
                      <input
                        type="text"
                        id="spouseTaxAccountName"
                        value={spouseTaxAccountName}
                        onChange={(e) => setSpouseTaxAccountName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="spouseBusinessName" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name (Optional)
                      </label>
                      <input
                        type="text"
                        id="spouseBusinessName"
                        value={spouseBusinessName}
                        onChange={(e) => setSpouseBusinessName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Mary Smith"
                      />
                    </div>
                  </div>
                </div>

                {/* Final Name Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Final Tax Account Name:</strong> {primaryTaxAccountName || "[Primary]"} & {spouseTaxAccountName || "[Spouse]"}
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={creating}
                variant="primary"
                className="flex-1"
              >
                {creating ? "Creating..." : "Create Tax Account"}
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

