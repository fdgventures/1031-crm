"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { getAllEATLLCs } from "@/lib/eat-llc";
import { CreateEATLLCModal } from "@/components/CreateEATLLCModal";
import type { EATLLCWithAccess } from "@/types/eat.types";

export default function EATLLCManager() {
  const router = useRouter();
  const [eatLlcs, setEatLlcs] = useState<EATLLCWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEATLLCs = useCallback(async () => {
    setLoading(true);
    const data = await getAllEATLLCs();
    setEatLlcs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEATLLCs();
  }, [loadEATLLCs]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'dissolved':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">EAT LLCs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Exchange Accommodation Titleholder entities for parking properties
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="small"
        >
          + Create EAT LLC
        </Button>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading EAT LLCs...</p>
          </div>
        ) : eatLlcs.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No EAT LLCs</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating an EAT LLC for parking properties
            </p>
            <div className="mt-6">
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                size="small"
              >
                + Create First EAT LLC
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      EAT Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      State
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Formation Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Profile Access
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eatLlcs.map((eat) => (
                    <tr
                      key={eat.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {eat.company_name}
                        </div>
                        {eat.licensed_in && (
                          <div className="text-xs text-gray-500">
                            Licensed in: {eat.licensed_in}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-mono text-blue-600">
                          {eat.eat_number || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {eat.state_formation}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(eat.date_formation).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {eat.profile_accesses && eat.profile_accesses.length > 0 ? (
                          <>
                            {eat.profile_accesses.slice(0, 2).map((access) => (
                              <span
                                key={access.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {access.user_profile?.email?.split('@')[0]}
                              </span>
                            ))}
                            {eat.profile_accesses.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{eat.profile_accesses.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full border ${getStatusColor(eat.status)}`}>
                          {eat.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => router.push(`/eat/${eat.id}`)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">{eatLlcs.length}</p>
              </div>
              <div className="bg-green-50 rounded p-3">
                <p className="text-xs text-gray-600">Active</p>
                <p className="text-xl font-bold text-green-600">
                  {eatLlcs.filter(e => e.status === 'Active').length}
                </p>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <p className="text-xs text-gray-600">Popular States</p>
                <p className="text-xl font-bold text-blue-600">
                  {eatLlcs.filter(e => ['DE', 'WY', 'NV'].includes(e.state_formation)).length}
                </p>
              </div>
              <div className="bg-purple-50 rounded p-3">
                <p className="text-xs text-gray-600">With Access</p>
                <p className="text-xl font-bold text-purple-600">
                  {eatLlcs.filter(e => e.profile_accesses && e.profile_accesses.length > 0).length}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <CreateEATLLCModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadEATLLCs();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}

