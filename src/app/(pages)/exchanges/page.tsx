"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

export default function ExchangesPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExchanges();
  }, []);

  const loadExchanges = async () => {
    try {
      const { data, error } = await supabase
        .from("exchanges")
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExchanges(data || []);
    } catch (err) {
      console.error("Failed to load exchanges:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load exchanges"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exchanges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Exchanges</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Exchanges List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exchange Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exchanges.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No exchanges found
                  </td>
                </tr>
              ) : (
                exchanges.map((exchange) => (
                  <tr
                    key={exchange.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/exchanges/${exchange.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {exchange.exchange_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {exchange.tax_account?.name || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {exchange.tax_account?.profile
                          ? `${exchange.tax_account.profile.first_name} ${exchange.tax_account.profile.last_name}`
                          : exchange.tax_account?.entity
                          ? exchange.tax_account.entity.name
                          : "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {exchange.tax_account?.profile?.email ||
                          exchange.tax_account?.entity?.email ||
                          ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {exchange.tax_account?.account_number || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exchange.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/exchanges/${exchange.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
