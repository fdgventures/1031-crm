"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";
import { DocumentRepository } from "@/components/document-repository";
import { TaskManager } from "@/components/TaskManager";
import { LogViewer } from "@/components/LogViewer";
import { FinalSettlementStatement } from "@/components/FinalSettlementStatement";
import { MessagingSystem } from "@/components/MessagingSystem";

interface Transaction {
  id: number;
  transaction_number: string;
  contract_purchase_price: number;
  contract_date: string;
  pdf_contract_url: string | null;
  sale_type: "Property" | "Entity";
  created_at: string;
  updated_at: string;
  status?: string | null;
  estimated_close_date?: string | null;
  actual_close_date?: string | null;
  closing_agent?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string | null;
  };
}

interface TransactionSeller {
  id: number;
  tax_account_id: number | null;
  vesting_name: string | null;
  contract_percent: number;
  non_exchange_name: string | null;
  tax_account?: {
    id: number;
    name: string;
    account_number?: string | null;
    profile?: {
      first_name: string;
      last_name: string;
      email?: string | null;
    };
    entity?: {
      name: string;
      email?: string | null;
    };
  };
}

interface TransactionBuyer {
  id: number;
  profile_id: number | null;
  contract_percent: number;
  non_exchange_name: string | null;
  profile?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string | null;
  };
}

interface Property {
  id: number;
  address: string;
}

type PropertyOwnershipRow = {
  property: Property | Property[] | null;
};

export default function TransactionViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const supabase = getSupabaseClient();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [sellers, setSellers] = useState<TransactionSeller[]>([]);
  const [buyers, setBuyers] = useState<TransactionBuyer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editStatusValues, setEditStatusValues] = useState({
    status: "",
    estimated_close_date: "",
    actual_close_date: "",
  });
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const loadTransactionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          closing_agent:closing_agent_profile_id (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq("id", id)
        .single();

      if (transactionError) {
        throw transactionError;
      }

      if (!transactionData) {
        throw new Error("Transaction not found");
      }

      setTransaction(transactionData as Transaction);

      const { data: sellersData, error: sellersError } = await supabase
        .from("transaction_sellers")
        .select(
          `
          *,
          tax_account:tax_account_id (
            id,
            name,
            account_number,
            profile:profile_id (
              first_name,
              last_name,
              email
            ),
            entity:entity_id (
              name,
              email
            )
          )
        `
        )
        .eq("transaction_id", id)
        .order("created_at", { ascending: true });

      if (sellersError) {
        throw sellersError;
      }

      setSellers((sellersData ?? []) as TransactionSeller[]);

      const { data: buyersData, error: buyersError } = await supabase
        .from("transaction_buyers")
        .select(
          `
          *,
          profile:profile_id (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq("transaction_id", id)
        .order("created_at", { ascending: true });

      if (buyersError) {
        throw buyersError;
      }

      setBuyers((buyersData ?? []) as TransactionBuyer[]);

      if (transactionData.sale_type === "Property") {
        const { data: ownershipData, error: ownershipError } = await supabase
          .from("property_ownership")
          .select(
            `
            property_id,
            property:property_id (
              id,
              address
            )
          `
          )
          .eq("transaction_id", id)
          .eq("ownership_type", "pending");

        if (ownershipError) {
          throw ownershipError;
        }

        const ownershipRows = (ownershipData ?? []) as PropertyOwnershipRow[];
        const propertyMap = new Map<number, Property>();

        ownershipRows.forEach((ownership) => {
          const propertyEntry = Array.isArray(ownership.property)
            ? ownership.property[0]
            : ownership.property;

          if (propertyEntry) {
            propertyMap.set(propertyEntry.id, propertyEntry);
          }
        });

        setProperties(Array.from(propertyMap.values()));
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error("Failed to load transaction:", err);
      setError(getErrorMessage(err, "Failed to load transaction"));
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    void loadTransactionData();
  }, [loadTransactionData]);

  const startEditingStatus = () => {
    if (!transaction) return;
    setEditStatusValues({
      status: transaction.status || "Pending",
      estimated_close_date: transaction.estimated_close_date || "",
      actual_close_date: transaction.actual_close_date || "",
    });
    setIsEditingStatus(true);
  };

  const cancelEditingStatus = () => {
    setIsEditingStatus(false);
  };

  const saveStatusChanges = async () => {
    if (!transaction) return;

    try {
      setIsSavingStatus(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: editStatusValues.status || null,
          estimated_close_date: editStatusValues.estimated_close_date || null,
          actual_close_date: editStatusValues.actual_close_date || null,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await loadTransactionData();
      setIsEditingStatus(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
      setError(getErrorMessage(err, "Failed to save changes"));
    } finally {
      setIsSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Transaction
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "Transaction not found"}
            </p>
            <Button
              onClick={() => router.push("/transactions")}
              variant="primary"
            >
              Back to Transactions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => router.push("/transactions")}
            variant="outline"
          >
            ← Back to Transactions
          </Button>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white">
                  {transaction.transaction_number}
                </h1>
                <p className="text-blue-100 mt-2">
                  {transaction.sale_type} Transaction
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Transaction Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Transaction Number
                </h3>
                <p className="text-lg text-gray-900">
                  {transaction.transaction_number}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Contract Purchase Price
                </h3>
                <p className="text-lg text-gray-900">
                  $
                  {transaction.contract_purchase_price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Contract Date
                </h3>
                <p className="text-lg text-gray-900">
                  {new Date(transaction.contract_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Sale Type
                </h3>
                <p className="text-lg text-gray-900">{transaction.sale_type}</p>
              </div>
              {transaction.closing_agent && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Closing Agent
                  </h3>
                  <p className="text-lg text-gray-900">
                    {transaction.closing_agent.first_name}{" "}
                    {transaction.closing_agent.last_name}
                  </p>
                  {transaction.closing_agent.email && (
                    <p className="text-sm text-gray-500">
                      {transaction.closing_agent.email}
                    </p>
                  )}
                </div>
              )}
              {transaction.pdf_contract_url && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    PDF Contract
                  </h3>
                  <a
                    href={transaction.pdf_contract_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View PDF Contract
                  </a>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Created
                </h3>
                <p className="text-lg text-gray-900">
                  {new Date(transaction.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Transaction Status
            </h2>
            {!isEditingStatus ? (
              <Button onClick={startEditingStatus} variant="outline">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={saveStatusChanges}
                  variant="primary"
                  disabled={isSavingStatus}
                >
                  {isSavingStatus ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={cancelEditingStatus}
                  variant="outline"
                  disabled={isSavingStatus}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                {isEditingStatus ? (
                  <select
                    value={editStatusValues.status}
                    onChange={(e) =>
                      setEditStatusValues({
                        ...editStatusValues,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Pending">Pending</option>
                    <option value="On-Hold">On-Hold</option>
                    <option value="Closed">Closed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                ) : (
                  <p className="text-lg text-gray-900">
                    {transaction.status || "Pending"}
                  </p>
                )}
              </div>

              {/* Estimated Close Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Estimated Close Date
                </h3>
                {isEditingStatus ? (
                  <input
                    type="date"
                    value={editStatusValues.estimated_close_date}
                    onChange={(e) =>
                      setEditStatusValues({
                        ...editStatusValues,
                        estimated_close_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {transaction.estimated_close_date
                      ? new Date(
                          transaction.estimated_close_date
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                )}
              </div>

              {/* Actual Close Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Actual Close Date
                </h3>
                {isEditingStatus ? (
                  <input
                    type="date"
                    value={editStatusValues.actual_close_date}
                    onChange={(e) =>
                      setEditStatusValues({
                        ...editStatusValues,
                        actual_close_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {transaction.actual_close_date
                      ? new Date(
                          transaction.actual_close_date
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Info about 1031 Exchange Timeline */}
            {transaction.status === 'Closed' && transaction.actual_close_date && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  🕐 1031 Exchange Timeline
                </h4>
                <p className="text-sm text-blue-800">
                  Based on actual close date: <strong>{new Date(transaction.actual_close_date).toLocaleDateString()}</strong>
                </p>
                <div className="mt-2 space-y-1 text-sm text-blue-700">
                  <div>
                    • <strong>45-Day Deadline:</strong> {new Date(new Date(transaction.actual_close_date).getTime() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString()} (Identify replacement properties)
                  </div>
                  <div>
                    • <strong>180-Day Deadline:</strong> {new Date(new Date(transaction.actual_close_date).getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString()} (Complete exchange)
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  These dates will be automatically set in linked exchanges when status is marked as Closed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sellers & Buyers */}
        <div className="grid gap-6 lg:grid-cols-2 mt-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Sellers</h2>
            </div>
            <div className="p-6">
              {sellers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No sellers found
                </p>
              ) : (
                <div className="space-y-4">
                  {sellers.map((seller, index) => (
                    <div
                      key={seller.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-gray-900">
                          Seller {index + 1}
                        </h3>
                        <span className="text-sm font-medium text-gray-700">
                          {seller.contract_percent}%
                        </span>
                      </div>
                      {seller.non_exchange_name ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {seller.non_exchange_name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Non-exchange seller
                          </p>
                        </div>
                      ) : seller.tax_account ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {seller.vesting_name || seller.tax_account.name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {seller.tax_account.profile
                              ? `${seller.tax_account.profile.first_name} ${seller.tax_account.profile.last_name}`
                              : seller.tax_account.entity
                              ? seller.tax_account.entity.name
                              : seller.tax_account.name}
                          </p>
                          {seller.tax_account.account_number && (
                            <p className="text-xs text-gray-400 mt-1">
                              Tax Account: {seller.tax_account.account_number}
                            </p>
                          )}
                          {seller.tax_account.profile?.email && (
                            <p className="text-xs text-gray-400">
                              {seller.tax_account.profile.email}
                            </p>
                          )}
                          {seller.tax_account.entity?.email && (
                            <p className="text-xs text-gray-400">
                              {seller.tax_account.entity.email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">No seller information</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Buyers</h2>
            </div>
            <div className="p-6">
              {buyers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No buyers found
                </p>
              ) : (
                <div className="space-y-4">
                  {buyers.map((buyer, index) => (
                    <div
                      key={buyer.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-gray-900">
                          Buyer {index + 1}
                        </h3>
                        <span className="text-sm font-medium text-gray-700">
                          {buyer.contract_percent}%
                        </span>
                      </div>
                      {buyer.non_exchange_name ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {buyer.non_exchange_name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Non-exchange buyer
                          </p>
                        </div>
                      ) : buyer.profile ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {buyer.profile.first_name} {buyer.profile.last_name}
                          </p>
                          {buyer.profile.email && (
                            <p className="text-sm text-gray-500 mt-1">
                              {buyer.profile.email}
                            </p>
                          )}
                          <Link
                            href={`/profiles/${buyer.profile.id}`}
                            className="text-blue-600 hover:text-blue-900 text-sm mt-2 inline-block"
                          >
                            View Profile →
                          </Link>
                        </div>
                      ) : (
                        <p className="text-gray-500">No buyer information</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Settlement Statement */}
        <div className="mt-6">
          <FinalSettlementStatement
            transactionId={id}
            sellers={sellers}
            buyers={buyers}
          />
        </div>

        {/* Properties Section (only for Property transactions) */}
        {transaction.sale_type === "Property" && properties.length > 0 && (
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Properties
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/properties/${property.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {property.address}
                        </p>
                      </div>
                      <Link
                        href={`/properties/${property.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Property →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <DocumentRepository entityType="transaction" entityId={id} />
        </div>

        {/* Messaging System */}
        <div className="mt-6">
          <MessagingSystem
            entityType="transaction"
            entityId={parseInt(id)}
            entityName={transaction?.transaction_number}
          />
        </div>

        {/* Tasks Section */}
        <div className="mt-6">
          <TaskManager
            entityType="transaction"
            entityId={parseInt(id)}
            entityName={transaction?.transaction_number}
            onLogCreate={() => setLogRefreshTrigger(Date.now())}
          />
        </div>

        {/* Activity Log Section */}
        <div className="mt-6">
          <LogViewer
            entityType="transaction"
            entityId={parseInt(id)}
            entityName={transaction?.transaction_number}
            refreshTrigger={logRefreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
