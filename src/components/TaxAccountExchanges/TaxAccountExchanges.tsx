"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  loadTaxAccountExchanges,
  type TaxAccountExchange,
} from "@/lib/tax-account-exchanges";

interface TaxAccountExchangesProps {
  taxAccountId: number;
}

export default function TaxAccountExchanges({ taxAccountId }: TaxAccountExchangesProps) {
  const [exchanges, setExchanges] = useState<TaxAccountExchange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [taxAccountId]);

  const loadData = async () => {
    setLoading(true);
    const result = await loadTaxAccountExchanges(taxAccountId);
    setExchanges(result);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDaysRemaining = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exchanges...</p>
        </div>
      </div>
    );
  }

  if (exchanges.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center text-gray-500">
          <p>No 1031 exchanges found for this tax account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">1031 Exchanges</h2>
        <p className="text-sm text-gray-600 mt-1">
          {exchanges.length} {exchanges.length === 1 ? 'exchange' : 'exchanges'}
        </p>
      </div>

      {/* Exchanges Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exchanges.map((exchange) => (
            <ExchangeCard
              key={exchange.id}
              exchange={exchange}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              getDaysRemaining={getDaysRemaining}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Exchange Card Component
interface ExchangeCardProps {
  exchange: TaxAccountExchange;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status?: string | null) => string;
  getDaysRemaining: (date: string) => number;
}

function ExchangeCard({
  exchange,
  formatCurrency,
  formatDate,
  getStatusColor,
  getDaysRemaining,
}: ExchangeCardProps) {
  // Рассчитываем прогресс реинвестирования
  const reinvestmentPercent = exchange.totalSaleValue > 0
    ? (exchange.totalReplacementValue / exchange.totalSaleValue) * 100
    : 0;

  // Проверяем дедлайны
  const day45Remaining = exchange.day_45_date ? getDaysRemaining(exchange.day_45_date) : null;
  const day180Remaining = exchange.day_180_date ? getDaysRemaining(exchange.day_180_date) : null;

  return (
    <Link
      href={`/exchanges/${exchange.id}`}
      className="block border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg transition-all bg-white"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-600 text-sm truncate">
            {exchange.exchange_number}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Created {formatDate(exchange.created_at)}
          </p>
        </div>
        <span className={`px-2 py-1 rounded border text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(exchange.status)}`}>
          {exchange.status || 'Pending'}
        </span>
      </div>

      {/* Financial Summary */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Sale Value:</span>
          <span className="font-semibold text-green-700">
            {formatCurrency(exchange.totalSaleValue)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Replacement:</span>
          <span className="font-semibold text-purple-700">
            {formatCurrency(exchange.totalReplacementValue)}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Reinvested:</span>
            <span className="font-semibold text-gray-900">
              {reinvestmentPercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                reinvestmentPercent >= 100 ? 'bg-green-500' :
                reinvestmentPercent >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(reinvestmentPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-green-50 rounded p-2 text-center">
          <p className="text-xs text-gray-600">Sales</p>
          <p className="text-lg font-bold text-green-700">
            {exchange.saleTransactionsCount}
          </p>
        </div>
        <div className="bg-purple-50 rounded p-2 text-center">
          <p className="text-xs text-gray-600">Buys</p>
          <p className="text-lg font-bold text-purple-700">
            {exchange.purchaseTransactionsCount}
          </p>
        </div>
        <div className="bg-blue-50 rounded p-2 text-center">
          <p className="text-xs text-gray-600">Props</p>
          <p className="text-lg font-bold text-blue-700">
            {exchange.identifiedPropertiesCount}
          </p>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-gray-50 rounded p-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Current Balance:</span>
          <span className={`text-sm font-bold ${
            exchange.currentBalance > 0 ? 'text-blue-700' :
            exchange.currentBalance < 0 ? 'text-red-700' :
            'text-gray-700'
          }`}>
            {formatCurrency(Math.abs(exchange.currentBalance))}
          </span>
        </div>
      </div>

      {/* Deadlines */}
      {(exchange.day_45_date || exchange.day_180_date) && (
        <div className="border-t border-gray-200 pt-3 space-y-2">
          {exchange.day_45_date && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">45-Day:</span>
              <span className={`font-semibold ${
                day45Remaining !== null && day45Remaining < 0 ? 'text-red-600' :
                day45Remaining !== null && day45Remaining <= 7 ? 'text-orange-600' :
                'text-gray-700'
              }`}>
                {formatDate(exchange.day_45_date)}
                {day45Remaining !== null && day45Remaining >= 0 && (
                  <span className="ml-1">({day45Remaining}d)</span>
                )}
              </span>
            </div>
          )}
          {exchange.day_180_date && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">180-Day:</span>
              <span className={`font-semibold ${
                day180Remaining !== null && day180Remaining < 0 ? 'text-red-600' :
                day180Remaining !== null && day180Remaining <= 30 ? 'text-orange-600' :
                'text-gray-700'
              }`}>
                {formatDate(exchange.day_180_date)}
                {day180Remaining !== null && day180Remaining >= 0 && (
                  <span className="ml-1">({day180Remaining}d)</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Link indicator */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-blue-600">
          <span>View details</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

