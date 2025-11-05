"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  loadTaxAccountTransactions,
  type TaxAccountTransaction,
  type GroupedTransactions,
} from "@/lib/tax-account-transactions";

interface TaxAccountTransactionsProps {
  taxAccountId: number;
}

export default function TaxAccountTransactions({ taxAccountId }: TaxAccountTransactionsProps) {
  const [data, setData] = useState<GroupedTransactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredExchangeId, setHoveredExchangeId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [taxAccountId]);

  const loadData = async () => {
    setLoading(true);
    const result = await loadTaxAccountTransactions(taxAccountId);
    setData(result);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'on-hold':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (!data || data.exchangeGroups.size === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center text-gray-500">
          <p>No transactions found for this tax account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
        <p className="text-sm text-gray-600 mt-1">
          Grouped by 1031 Exchange
        </p>
      </div>

      {/* Exchanges and Transactions */}
      <div className="p-6 space-y-8">
        {Array.from(data.exchangeGroups.values()).map((group) => (
          <div
            key={group.exchangeId}
            className={`border-2 rounded-lg p-6 transition-all ${
              hoveredExchangeId === group.exchangeId
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-gray-50'
            }`}
            onMouseEnter={() => setHoveredExchangeId(group.exchangeId)}
            onMouseLeave={() => setHoveredExchangeId(null)}
          >
            {/* Exchange Header */}
            <div className="mb-6">
              <Link
                href={`/exchanges/${group.exchangeId}`}
                className="inline-flex items-center gap-2 text-lg font-semibold text-blue-600 hover:text-blue-800"
              >
                <span className="bg-blue-100 px-3 py-1 rounded-full">
                  {group.exchangeNumber}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Relinquished (Sale) */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <span className="bg-green-100 px-2 py-1 rounded">
                    Relinquished (Sale)
                  </span>
                  {group.sales.length > 0 && (
                    <span className="text-xs text-gray-600">
                      {group.sales.length} {group.sales.length === 1 ? 'property' : 'properties'}
                    </span>
                  )}
                </h3>
                
                <div className="space-y-3">
                  {group.sales.length === 0 ? (
                    <div className="text-sm text-gray-500 italic p-4 bg-white rounded border border-gray-200">
                      No sale transactions yet
                    </div>
                  ) : (
                    group.sales.map((tx) => (
                      <TransactionCard
                        key={tx.id}
                        transaction={tx}
                        type="sale"
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        getStatusColor={getStatusColor}
                        isHighlighted={hoveredExchangeId === group.exchangeId}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Arrow Connection (visible on large screens) */}
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className={`flex items-center transition-all ${
                  hoveredExchangeId === group.exchangeId
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

              {/* Replacement (Buy) */}
              <div>
                <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <span className="bg-purple-100 px-2 py-1 rounded">
                    Replacement (Buy)
                  </span>
                  {group.purchases.length > 0 && (
                    <span className="text-xs text-gray-600">
                      {group.purchases.length} {group.purchases.length === 1 ? 'property' : 'properties'}
                    </span>
                  )}
                </h3>
                
                <div className="space-y-3">
                  {group.purchases.length === 0 ? (
                    <div className="text-sm text-gray-500 italic p-4 bg-white rounded border border-gray-200">
                      No purchase transactions yet
                    </div>
                  ) : (
                    group.purchases.map((tx) => (
                      <TransactionCard
                        key={tx.id}
                        transaction={tx}
                        type="purchase"
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        getStatusColor={getStatusColor}
                        isHighlighted={hoveredExchangeId === group.exchangeId}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Transaction Card Component
interface TransactionCardProps {
  transaction: TaxAccountTransaction;
  type: "sale" | "purchase";
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status?: string | null) => string;
  isHighlighted: boolean;
}

function TransactionCard({
  transaction,
  type,
  formatCurrency,
  formatDate,
  getStatusColor,
  isHighlighted,
}: TransactionCardProps) {
  const borderColor = type === "sale" ? "border-green-200" : "border-purple-200";
  const bgColor = type === "sale" ? "bg-white" : "bg-white";

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className={`block border-2 rounded-lg p-4 transition-all hover:shadow-md ${borderColor} ${bgColor} ${
        isHighlighted ? 'ring-2 ring-blue-300' : ''
      }`}
    >
      {/* Property Address */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">
            {transaction.property_address || "No address"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {transaction.sale_type}
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>

      {/* Parties */}
      <div className="mb-3 text-xs">
        {type === "sale" && transaction.sellers.length > 0 && (
          <div className="flex items-center gap-1 text-gray-700">
            <span className="font-medium">Seller:</span>
            <span>{transaction.sellers[0].name}</span>
            {transaction.sellers.length > 1 && (
              <span className="text-gray-500">+{transaction.sellers.length - 1}</span>
            )}
          </div>
        )}
        {type === "purchase" && transaction.buyers.length > 0 && (
          <div className="flex items-center gap-1 text-gray-700">
            <span className="font-medium">Buyer:</span>
            <span>{transaction.buyers[0].name}</span>
            {transaction.buyers.length > 1 && (
              <span className="text-gray-500">+{transaction.buyers.length - 1}</span>
            )}
          </div>
        )}
      </div>

      {/* Financial Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-gray-50 p-2 rounded">
          <p className="text-gray-600">Value</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(transaction.total_value || 0)}
          </p>
        </div>
        {type === "sale" && transaction.funds_to_exchange ? (
          <div className="bg-green-50 p-2 rounded">
            <p className="text-gray-600">To Exchange</p>
            <p className="font-semibold text-green-700">
              {formatCurrency(transaction.funds_to_exchange)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Transaction Details */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-1 rounded border text-xs font-medium ${getStatusColor(transaction.status)}`}>
          {transaction.status || 'Pending'}
        </span>
        
        {(transaction.actual_close_date || transaction.estimated_close_date) && (
          <span className="text-gray-600">
            {formatDate(transaction.actual_close_date || transaction.estimated_close_date!)}
          </span>
        )}
        
        <span className="text-gray-500 font-mono">
          {transaction.transaction_number}
        </span>
      </div>
    </Link>
  );
}

