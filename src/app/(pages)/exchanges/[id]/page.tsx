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
import AccountingTable from "@/components/AccountingTable/AccountingTable";

interface Exchange {
  id: number;
  exchange_number: string;
  tax_account_id: number;
  created_at: string;
  updated_at: string;
  status?: string | null;
  relinquished_close_date?: string | null;
  day_45_date?: string | null;
  day_180_date?: string | null;
  total_sale_property_value?: number | null;
  total_replacement_property?: number | null;
  value_remaining?: number | null;
  tax_account?: {
    id: number;
    name: string;
    account_number?: string | null;
    profile?: {
      id: number;
      first_name: string;
      last_name: string;
      email?: string | null;
    };
    entity?: {
      id: number;
      name: string;
      email?: string | null;
    };
  };
}

interface ExchangeTransaction {
  id: number;
  exchange_id: number;
  transaction_id: number;
  transaction_type: "Sale" | "Purchase";
  created_at: string;
  transaction?: {
    id: number;
    transaction_number: string;
    contract_purchase_price: number;
    contract_date: string;
    sale_type: "Property" | "Entity";
    created_at: string;
  };
}

export default function ExchangeViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const supabase = getSupabaseClient();
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    status: "",
    relinquished_close_date: "",
    day_45_date: "",
    day_180_date: "",
    total_sale_property_value: "",
    total_replacement_property: "",
    value_remaining: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadExchangeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load exchange with tax account and owner info
      const { data: exchangeData, error: exchangeError } = await supabase
        .from("exchanges")
        .select(
          `
          *,
          tax_account:tax_account_id (
            id,
            name,
            account_number,
            profile:profile_id (
              id,
              first_name,
              last_name,
              email
            ),
            entity:entity_id (
              id,
              name,
              email
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (exchangeError) throw exchangeError;
      setExchange(exchangeData);

      // Load related transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("exchange_transactions")
        .select(
          `
          *,
          transaction:transaction_id (
            id,
            transaction_number,
            contract_purchase_price,
            contract_date,
            sale_type,
            created_at
          )
        `
        )
        .eq("exchange_id", id)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (err) {
      console.error("Failed to load exchange:", err);
      setError(getErrorMessage(err, "Failed to load exchange"));
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    void loadExchangeData();
  }, [loadExchangeData]);

  const startEditing = () => {
    if (!exchange) return;
    setEditValues({
      status: exchange.status || "Pending",
      relinquished_close_date: exchange.relinquished_close_date || "",
      day_45_date: exchange.day_45_date || "",
      day_180_date: exchange.day_180_date || "",
      total_sale_property_value: exchange.total_sale_property_value?.toString() || "",
      total_replacement_property: exchange.total_replacement_property?.toString() || "",
      value_remaining: exchange.value_remaining?.toString() || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!exchange) return;
    
    try {
      setIsSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("exchanges")
        .update({
          status: editValues.status || null,
          relinquished_close_date: editValues.relinquished_close_date || null,
          day_45_date: editValues.day_45_date || null,
          day_180_date: editValues.day_180_date || null,
          total_sale_property_value: editValues.total_sale_property_value ? parseFloat(editValues.total_sale_property_value) : null,
          total_replacement_property: editValues.total_replacement_property ? parseFloat(editValues.total_replacement_property) : null,
          value_remaining: editValues.value_remaining ? parseFloat(editValues.value_remaining) : null,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await loadExchangeData();
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
      setError(getErrorMessage(err, "Failed to save changes"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exchange...</p>
        </div>
      </div>
    );
  }

  if (error || !exchange) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Exchange
            </h2>
            <p className="text-gray-600 mb-6">{error || "Exchange not found"}</p>
            <Button onClick={() => router.push("/exchanges")} variant="primary">
              Back to Exchanges
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const saleTransactions = transactions.filter((t) => t.transaction_type === "Sale");
  const purchaseTransactions = transactions.filter(
    (t) => t.transaction_type === "Purchase"
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/exchanges")} variant="outline">
            ← Back to Exchanges
          </Button>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white">
                  {exchange.exchange_number}
                </h1>
              </div>
            </div>
          </div>

          {/* Exchange Details */}
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Exchange Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Exchange Number
                </h3>
                <p className="text-lg text-gray-900">{exchange.exchange_number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Created</h3>
                <p className="text-lg text-gray-900">
                  {new Date(exchange.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Information */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Exchange Information
            </h2>
            {!isEditing ? (
              <Button onClick={startEditing} variant="outline">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={saveChanges} 
                  variant="primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button 
                  onClick={cancelEditing} 
                  variant="outline"
                  disabled={isSaving}
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
                {isEditing ? (
                  <select
                    value={editValues.status}
                    onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.status || "Pending"}
                  </p>
                )}
              </div>

              {/* Relinquished Close Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Relinquished Close Date
                </h3>
                {isEditing ? (
                  <input
                    type="date"
                    value={editValues.relinquished_close_date}
                    onChange={(e) => setEditValues({ ...editValues, relinquished_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.relinquished_close_date 
                      ? new Date(exchange.relinquished_close_date).toLocaleDateString() 
                      : "—"}
                  </p>
                )}
              </div>

              {/* 45 Day Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  45 Day Date
                </h3>
                {isEditing ? (
                  <input
                    type="date"
                    value={editValues.day_45_date}
                    onChange={(e) => setEditValues({ ...editValues, day_45_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.day_45_date 
                      ? new Date(exchange.day_45_date).toLocaleDateString() 
                      : "—"}
                  </p>
                )}
              </div>

              {/* 180 Day Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  180 Day Date
                </h3>
                {isEditing ? (
                  <input
                    type="date"
                    value={editValues.day_180_date}
                    onChange={(e) => setEditValues({ ...editValues, day_180_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.day_180_date 
                      ? new Date(exchange.day_180_date).toLocaleDateString() 
                      : "—"}
                  </p>
                )}
              </div>

              {/* Total Sale Property Value */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Total Sale Property Value
                </h3>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.total_sale_property_value}
                    onChange={(e) => setEditValues({ ...editValues, total_sale_property_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.total_sale_property_value 
                      ? `$${exchange.total_sale_property_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : "—"}
                  </p>
                )}
              </div>

              {/* Total Replacement Property */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Total Replacement Property
                </h3>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.total_replacement_property}
                    onChange={(e) => setEditValues({ ...editValues, total_replacement_property: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.total_replacement_property 
                      ? `$${exchange.total_replacement_property.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : "—"}
                  </p>
                )}
              </div>

              {/* Value Remaining */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Value Remaining
                </h3>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editValues.value_remaining}
                    onChange={(e) => setEditValues({ ...editValues, value_remaining: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {exchange.value_remaining 
                      ? `$${exchange.value_remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : "—"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Owner</h2>
          </div>
          <div className="p-6">
            {exchange.tax_account ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Tax Account
                  </h3>
                  <p className="text-lg text-gray-900">{exchange.tax_account.name}</p>
                  {exchange.tax_account.account_number && (
                    <p className="text-sm text-gray-500 mt-1">
                      Account Number: {exchange.tax_account.account_number}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Owner</h3>
                  {exchange.tax_account.profile ? (
                    <div>
                      <p className="text-lg text-gray-900">
                        {exchange.tax_account.profile.first_name}{" "}
                        {exchange.tax_account.profile.last_name}
                      </p>
                      {exchange.tax_account.profile.email && (
                        <p className="text-sm text-gray-500 mt-1">
                          {exchange.tax_account.profile.email}
                        </p>
                      )}
                      <Link
                        href={`/profiles/${exchange.tax_account.profile.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm mt-2 inline-block"
                      >
                        View Profile →
                      </Link>
                    </div>
                  ) : exchange.tax_account.entity ? (
                    <div>
                      <p className="text-lg text-gray-900">
                        {exchange.tax_account.entity.name}
                      </p>
                      {exchange.tax_account.entity.email && (
                        <p className="text-sm text-gray-500 mt-1">
                          {exchange.tax_account.entity.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No owner information</p>
                  )}
                </div>

                <div>
                  <Link
                    href={`/tax-accounts/${exchange.tax_account.id}`}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    View Tax Account →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No tax account information</p>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
          </div>
          <div className="p-6">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No transactions found for this exchange
              </p>
            ) : (
              <div className="space-y-6">
                {/* Sale Transactions */}
                {saleTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 mb-4">
                      Sale Transactions
                    </h3>
                    <div className="space-y-3">
                      {saleTransactions.map((exchangeTransaction) => (
                        <div
                          key={exchangeTransaction.id}
                          className="border border-red-200 rounded-lg p-4 hover:bg-red-50 cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/transactions/${exchangeTransaction.transaction_id}`
                            )
                          }
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              {exchangeTransaction.transaction && (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {exchangeTransaction.transaction.transaction_number}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {exchangeTransaction.transaction.sale_type} Transaction
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    ${exchangeTransaction.transaction.contract_purchase_price.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(
                                      exchangeTransaction.transaction.contract_date
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            <Link
                              href={`/transactions/${exchangeTransaction.transaction_id}`}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase Transactions */}
                {purchaseTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-4">
                      Purchase Transactions
                    </h3>
                    <div className="space-y-3">
                      {purchaseTransactions.map((exchangeTransaction) => (
                        <div
                          key={exchangeTransaction.id}
                          className="border border-green-200 rounded-lg p-4 hover:bg-green-50 cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/transactions/${exchangeTransaction.transaction_id}`
                            )
                          }
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              {exchangeTransaction.transaction && (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {exchangeTransaction.transaction.transaction_number}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {exchangeTransaction.transaction.sale_type} Transaction
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    ${exchangeTransaction.transaction.contract_purchase_price.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(
                                      exchangeTransaction.transaction.contract_date
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            <Link
                              href={`/transactions/${exchangeTransaction.transaction_id}`}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Accounting Section */}
        <div className="mt-6">
          <AccountingTable
            exchangeId={parseInt(id)}
            onEntryChange={() => void loadExchangeData()}
          />
        </div>

        <div className="mt-8">
          <DocumentRepository entityType="exchange" entityId={id} />
        </div>

        {/* Tasks Section */}
        <div className="mt-6">
          <TaskManager
            entityType="exchange"
            entityId={parseInt(id)}
            entityName={exchange?.exchange_number}
            onLogCreate={() => setLogRefreshTrigger(Date.now())}
          />
        </div>

        {/* Activity Log Section */}
        <div className="mt-6">
          <LogViewer
            entityType="exchange"
            entityId={parseInt(id)}
            entityName={exchange?.exchange_number}
            refreshTrigger={logRefreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
