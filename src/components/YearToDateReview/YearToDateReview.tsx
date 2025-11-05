"use client";

import React, { useState, useEffect } from "react";
import {
  calculateYearToDateMetrics,
  calculateCurrentYearMetrics,
  type YearToDateMetrics,
} from "@/lib/tax-account-ytd-calculations";

interface YearToDateReviewProps {
  taxAccountId: number;
}

type DateRangeMode = "year" | "custom";

export default function YearToDateReview({ taxAccountId }: YearToDateReviewProps) {
  const [mode, setMode] = useState<DateRangeMode>("year");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [metrics, setMetrics] = useState<YearToDateMetrics>({
    totalValuePropertySold: 0,
    totalAmountReceivedToQI: 0,
    totalExchangeableValueAcquired: 0,
    fundsReturnedToExchanger: 0,
    totalFundsSentFromExchange: 0,
  });
  const [loading, setLoading] = useState(true);

  // Генерируем список годов (последние 10 лет + следующий год)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 10 + i);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      let result: YearToDateMetrics;
      
      if (mode === "year") {
        const start = `${selectedYear}-01-01`;
        const end = `${selectedYear}-12-31`;
        result = await calculateYearToDateMetrics(taxAccountId, start, end);
      } else {
        if (!startDate || !endDate) {
          setLoading(false);
          return;
        }
        result = await calculateYearToDateMetrics(taxAccountId, startDate, endDate);
      }
      
      setMetrics(result);
    } catch (error) {
      console.error("Failed to load YTD metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [taxAccountId, mode, selectedYear, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Year to Date Review
        </h2>
      </div>

      {/* Date Range Selector */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="flex bg-white border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setMode("year")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "year"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                By Year
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                  mode === "custom"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Year Selector */}
          {mode === "year" && (
            <div>
              <label
                htmlFor="year-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Year
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Date Range */}
          {mode === "custom" && (
            <>
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="end-date"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metrics Display */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading metrics...</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Value of Property Sold */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Total Value of Property Sold
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {formatCurrency(metrics.totalValuePropertySold)}
                  </p>
                </div>
                <div className="bg-green-200 rounded-full p-3">
                  <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2">
                From sale proceeds
              </p>
            </div>

            {/* Total Amount Received to QI */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Total $ Amount Received to QI
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {formatCurrency(metrics.totalAmountReceivedToQI)}
                  </p>
                </div>
                <div className="bg-blue-200 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                All credits to exchanges
              </p>
            </div>

            {/* Total Exchangeable Value Acquired */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800 mb-1">
                    Total Exchangeable Value Acquired
                  </p>
                  <p className="text-3xl font-bold text-purple-900">
                    {formatCurrency(metrics.totalExchangeableValueAcquired)}
                  </p>
                </div>
                <div className="bg-purple-200 rounded-full p-3">
                  <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                From purchase funds
              </p>
            </div>

            {/* Funds Returned to Exchanger (Boot) */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800 mb-1">
                    Funds Returned (Taxable Boot)
                  </p>
                  <p className="text-3xl font-bold text-orange-900">
                    {formatCurrency(metrics.fundsReturnedToExchanger)}
                  </p>
                </div>
                <div className="bg-orange-200 rounded-full p-3">
                  <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-orange-700 mt-2">
                Not reinvested (taxable)
              </p>
            </div>

            {/* Total Funds Sent from Exchange */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Total Funds Sent from Exchange
                  </p>
                  <p className="text-3xl font-bold text-red-900">
                    {formatCurrency(metrics.totalFundsSentFromExchange)}
                  </p>
                </div>
                <div className="bg-red-200 rounded-full p-3">
                  <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-red-700 mt-2">
                All debits from exchanges
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-300">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-gray-800">
                  Summary
                </p>
                <div className="bg-gray-300 rounded-full p-3">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Net Cash Flow:</span>
                  <span className={`font-semibold ${
                    metrics.totalAmountReceivedToQI - metrics.totalFundsSentFromExchange >= 0
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    {formatCurrency(metrics.totalAmountReceivedToQI - metrics.totalFundsSentFromExchange)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reinvestment Rate:</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.totalValuePropertySold > 0
                      ? `${((metrics.totalExchangeableValueAcquired / metrics.totalValuePropertySold) * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Period Information */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Period:</span>{" "}
              {mode === "year"
                ? `Year ${selectedYear}`
                : startDate && endDate
                ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                : "Select date range"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

