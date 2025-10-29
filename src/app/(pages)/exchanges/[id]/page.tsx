"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Exchange {
  id: number;
  exchange_number: string;
  tax_account_id: number;
  created_at: string;
  updated_at: string;
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
  const resolvedParams = use(params);
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExchangeData();
  }, [resolvedParams.id]);

  const loadExchangeData = async () => {
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
        .eq("id", resolvedParams.id)
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
        .eq("exchange_id", resolvedParams.id)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (err: any) {
      console.error("Failed to load exchange:", err);
      setError(err.message || "Failed to load exchange");
    } finally {
      setLoading(false);
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
      </div>
    </div>
  );
}
