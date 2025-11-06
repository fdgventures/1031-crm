"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { DocumentRepository } from "@/components/document-repository";
import { TaskManager } from "@/components/TaskManager";
import { LogViewer } from "@/components/LogViewer";
import { MessagingSystem } from "@/components/MessagingSystem";
import { getSupabaseClient } from "@/lib/supabase";
import { CreateTaxAccountModalWithProfileSelect } from "@/components/CreateTaxAccountModal";
import {
  getEntity,
  updateEntity,
  addEntityProfileAccess,
  updateEntityProfileAccess,
  removeEntityProfileAccess,
  getEntityTaxAccounts,
  getEntityProperties,
  getEntityTransactions,
  type EntityWithAccess,
  type EntityProfileAccess,
} from "@/lib/entities";

export default function EntityProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [entity, setEntity] = useState<EntityWithAccess | null>(null);
  const [taxAccounts, setTaxAccounts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);

  // Editing
  const [isEditingMain, setIsEditingMain] = useState(false);
  const [editValues, setEditValues] = useState({
    name: "",
    email: "",
  });

  // Modals
  const [showAddAccessModal, setShowAddAccessModal] = useState(false);
  const [showCreateTaxAccountModal, setShowCreateTaxAccountModal] = useState(false);
  const [editingAccess, setEditingAccess] = useState<EntityProfileAccess | null>(null);
  
  // Tax Account creation form
  const [newTaxAccountName, setNewTaxAccountName] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");

  // Add Access form
  const [selectedTaxAccountId, setSelectedTaxAccountId] = useState<number | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<
    "Manager" | "Trustee" | "Owner/Member" | "Managing Member" | "Beneficiary"
  >("Owner/Member");
  const [hasSigningAuthority, setHasSigningAuthority] = useState(false);
  const [isMainContact, setIsMainContact] = useState(false);

  // Available tax accounts
  const [availableTaxAccounts, setAvailableTaxAccounts] = useState<any[]>([]);

  useEffect(() => {
    document.title = `Entity Profile | 1031 Exchange CRM`;
  }, []);

  const loadEntity = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEntity(parseInt(id));
      if (data) {
        setEntity(data);
        document.title = `${data.name} | Entities | 1031 Exchange CRM`;
      }
    } catch (error) {
      console.error("Error loading entity:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTaxAccounts = useCallback(async () => {
    const data = await getEntityTaxAccounts(parseInt(id));
    setTaxAccounts(data);
  }, [id]);

  const loadProperties = useCallback(async () => {
    const data = await getEntityProperties(parseInt(id));
    setProperties(data);
  }, [id]);

  const loadTransactions = useCallback(async () => {
    const data = await getEntityTransactions(parseInt(id));
    setTransactions(data);
  }, [id]);

  const loadAvailableTaxAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("tax_accounts")
      .select(
        `
        id,
        name,
        account_number,
        profile:profile_id (
          id,
          first_name,
          last_name,
          email
        )
      `
      )
      .order("name");

    setAvailableTaxAccounts(data || []);
  }, [supabase]);

  useEffect(() => {
    loadEntity();
    loadTaxAccounts();
    loadProperties();
    loadTransactions();
    loadAvailableTaxAccounts();
  }, [loadEntity, loadTaxAccounts, loadProperties, loadTransactions, loadAvailableTaxAccounts]);

  const startEditingMain = () => {
    if (!entity) return;
    setEditValues({
      name: entity.name,
      email: entity.email || "",
    });
    setIsEditingMain(true);
  };

  const saveMainChanges = async () => {
    if (!entity) return;

    const success = await updateEntity(entity.id, {
      name: editValues.name,
      email: editValues.email || null,
    });

    if (success) {
      await loadEntity();
      setIsEditingMain(false);
    }
  };

  const handleAddAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity || !selectedTaxAccountId) return;

    const success = await addEntityProfileAccess(
      entity.id,
      selectedTaxAccountId,
      selectedRelationship,
      hasSigningAuthority,
      isMainContact
    );

    if (success) {
      await loadEntity();
      setShowAddAccessModal(false);
      setSelectedTaxAccountId(null);
      setSelectedRelationship("Owner/Member");
      setHasSigningAuthority(false);
      setIsMainContact(false);
    }
  };

  const handleRemoveAccess = async (accessId: number) => {
    if (!confirm("Remove this profile access?")) return;

    const success = await removeEntityProfileAccess(accessId);
    if (success) {
      await loadEntity();
    }
  };

  const handleOpenCreateTaxAccountModal = () => {
    setNewTaxAccountName("");
    setNewBusinessName("");
    setShowCreateTaxAccountModal(true);
  };

  const handleCreateTaxAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaxAccountName.trim()) {
      alert("Please enter Tax Account Name");
      return;
    }

    try {
      // Create tax account for entity (no profile_id, only entity_id)
      const { data: taxAccount, error: taxAccountError } = await supabase
        .from("tax_accounts")
        .insert({
          name: newTaxAccountName,
          entity_id: entity!.id,
          is_spousal: false,
        })
        .select()
        .single();

      if (taxAccountError) throw taxAccountError;

      // Generate account number
      const { count } = await supabase
        .from("tax_accounts")
        .select("*", { count: "exact", head: true });

      const sequenceNumber = (count ?? 0).toString().padStart(3, "0");
      const namePrefix = newTaxAccountName
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, "X");
      const accountNumber = `INV${namePrefix}${sequenceNumber}`;

      await supabase
        .from("tax_accounts")
        .update({ account_number: accountNumber })
        .eq("id", taxAccount.id);

      // Create business name if provided
      if (newBusinessName.trim()) {
        await supabase.from("business_names").insert({
          name: newBusinessName,
          tax_account_id: taxAccount.id,
        });
      }

      // Create fee schedule from templates
      const { data: feeTemplates } = await supabase
        .from("fee_templates")
        .select("*")
        .eq("is_active", true);

      if (feeTemplates && feeTemplates.length > 0) {
        const feeSchedules = feeTemplates.map((template) => ({
          tax_account_id: taxAccount.id,
          name: template.name,
          amount: template.amount,
          description: template.description,
        }));
        await supabase.from("fee_schedules").insert(feeSchedules);
      }

      setShowCreateTaxAccountModal(false);
      setNewTaxAccountName("");
      setNewBusinessName("");
      loadTaxAccounts();
    } catch (err) {
      console.error("Error creating tax account:", err);
      alert(err instanceof Error ? err.message : "Error creating tax account");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading entity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-red-600">Entity not found</p>
            <Button
              onClick={() => router.push("/entities")}
              variant="outline"
              className="mt-4"
            >
              ← Back to Entities
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter available tax accounts
  const filteredAvailableTaxAccounts = availableTaxAccounts.filter(
    (ta) => !entity.profile_accesses?.some((pa) => pa.tax_account_id === ta.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <Button onClick={() => router.push("/entities")} variant="outline">
            ← Back to Entities
          </Button>
        </div>

        {/* Main Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
              {entity.email && (
                <p className="text-sm text-gray-600 mt-1">{entity.email}</p>
              )}
            </div>
            {!isEditingMain && (
              <Button onClick={startEditingMain} variant="outline">
                ✏️ Edit
              </Button>
            )}
            {isEditingMain && (
              <div className="flex gap-2">
                <Button onClick={saveMainChanges} variant="primary">
                  Save
                </Button>
                <Button onClick={() => setIsEditingMain(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Company Name
                </h3>
                {isEditingMain ? (
                  <input
                    type="text"
                    value={editValues.name}
                    onChange={(e) =>
                      setEditValues({ ...editValues, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">{entity.name}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                {isEditingMain ? (
                  <input
                    type="email"
                    value={editValues.email}
                    onChange={(e) =>
                      setEditValues({ ...editValues, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">{entity.email || "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Access Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Profile Access
            </h2>
            <Button
              onClick={() => setShowAddAccessModal(true)}
              variant="primary"
              size="small"
            >
              + Add Profile Access
            </Button>
          </div>

          <div className="p-6">
            {!entity.profile_accesses || entity.profile_accesses.length === 0 ? (
              <p className="text-gray-500 text-sm">No profile accesses yet</p>
            ) : (
              <div className="space-y-3">
                {entity.profile_accesses.map((access) => (
                  <div
                    key={access.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {access.tax_account?.profile && (
                          <div>
                            <p className="font-medium text-gray-900">
                              {access.tax_account.profile.first_name}{" "}
                              {access.tax_account.profile.last_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {access.tax_account.name}
                            </p>
                            {access.tax_account.profile.email && (
                              <p className="text-sm text-gray-500">
                                {access.tax_account.profile.email}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {access.relationship}
                          </span>
                          {access.has_signing_authority && (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              ✓ Signing Authority
                            </span>
                          )}
                          {access.is_main_contact && (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              ★ Main Contact
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleRemoveAccess(access.id)}
                        variant="destructive"
                        size="small"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tax Accounts Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Tax Accounts</h2>
            <Button
              onClick={handleOpenCreateTaxAccountModal}
              variant="primary"
              size="small"
            >
              + Create Tax Account
            </Button>
          </div>

          <div className="p-6">
            {taxAccounts.length === 0 ? (
              <p className="text-gray-500 text-sm">No tax accounts yet</p>
            ) : (
              <div className="space-y-3">
                {taxAccounts.map((ta) => (
                  <div
                    key={ta.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/tax-accounts/${ta.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{ta.name}</p>
                        {ta.account_number && (
                          <p className="text-sm text-gray-600">{ta.account_number}</p>
                        )}
                      </div>
                      <Link
                        href={`/tax-accounts/${ta.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Properties Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
          </div>

          <div className="p-6">
            {properties.length === 0 ? (
              <p className="text-gray-500 text-sm">No properties owned</p>
            ) : (
              <div className="space-y-3">
                {properties.map((prop: any) => (
                  <div
                    key={prop.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/properties/${prop.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{prop.address}</p>
                        {(prop.city || prop.state) && (
                          <p className="text-sm text-gray-600">
                            {prop.city}, {prop.state} {prop.zip}
                          </p>
                        )}
                        {prop.transaction && (
                          <p className="text-xs text-gray-500 mt-1">
                            Transaction: {prop.transaction.transaction_number}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/properties/${prop.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
          </div>

          <div className="p-6">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/transactions/${tx.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {tx.transaction_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          ${tx.contract_purchase_price?.toLocaleString()} - {tx.sale_type}
                        </p>
                        {tx.status && (
                          <p className="text-xs text-gray-500 mt-1">
                            Status: {tx.status}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <DocumentRepository entityType="property" entityId={id} />

        {/* Messaging */}
        <MessagingSystem
          entityType="property"
          entityId={parseInt(id)}
          entityName={entity.name}
        />

        {/* Tasks */}
        <TaskManager
          entityType="property"
          entityId={parseInt(id)}
          entityName={entity.name}
          onLogCreate={() => setLogRefreshTrigger(Date.now())}
        />

        {/* Activity Log */}
        <LogViewer
          entityType="property"
          entityId={parseInt(id)}
          entityName={entity.name}
          refreshTrigger={logRefreshTrigger}
        />
      </div>

      {/* Add Profile Access Modal */}
      {showAddAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Profile Access
                </h2>
                <button
                  onClick={() => setShowAddAccessModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddAccess} className="space-y-4">
                {/* Select Tax Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Tax Account *
                  </label>
                  <select
                    value={selectedTaxAccountId || ""}
                    onChange={(e) =>
                      setSelectedTaxAccountId(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select tax account...</option>
                    {filteredAvailableTaxAccounts.map((ta) => (
                      <option key={ta.id} value={ta.id}>
                        {ta.name}
                        {ta.account_number && ` (${ta.account_number})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <select
                    value={selectedRelationship}
                    onChange={(e) =>
                      setSelectedRelationship(
                        e.target.value as any
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Manager">Manager</option>
                    <option value="Trustee">Trustee</option>
                    <option value="Owner/Member">Owner/Member</option>
                    <option value="Managing Member">Managing Member</option>
                    <option value="Beneficiary">Beneficiary</option>
                  </select>
                </div>

                {/* Signing Authority */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="signingAuthority"
                    checked={hasSigningAuthority}
                    onChange={(e) => setHasSigningAuthority(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="signingAuthority"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Signing Authority (can sign documents)
                  </label>
                </div>

                {/* Main Contact */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="mainContact"
                    checked={isMainContact}
                    onChange={(e) => setIsMainContact(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="mainContact"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Main Contact
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    Add Access
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowAddAccessModal(false)}
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

      {/* Create Tax Account Modal */}
      {showCreateTaxAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Tax Account
                </h2>
                <button
                  onClick={() => setShowCreateTaxAccountModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Entity:</strong> {entity.name}
                </p>
              </div>

              <form onSubmit={handleCreateTaxAccount} className="space-y-4">
                {/* Tax Account Name */}
                <div>
                  <label
                    htmlFor="taxAccountName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Tax Account Name *
                  </label>
                  <input
                    id="taxAccountName"
                    type="text"
                    value={newTaxAccountName}
                    onChange={(e) => setNewTaxAccountName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter tax account name"
                    required
                  />
                </div>

                {/* Business Name */}
                <div>
                  <label
                    htmlFor="businessName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Name
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional business name"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    Create Tax Account
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowCreateTaxAccountModal(false)}
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

