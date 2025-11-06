"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { CreateEATModal } from "@/components/CreateEATModal";

interface EATParkedFile {
  id: number;
  eat_number: string;
  eat_name: string;
  status: string;
  state: string;
  total_acquired_property_value: number;
  total_sale_property_value: number;
  value_remaining: number;
  day_45_date: string | null;
  day_180_date: string | null;
  close_date: string | null;
  created_at: string;
  eat_llc?: {
    id: number;
    company_name: string;
  };
  exchangors?: Array<{
    tax_account: {
      id: number;
      name: string;
    };
  }>;
}

export default function EATPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [eatFiles, setEatFiles] = useState<EATParkedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    document.title = "EAT | 1031 Exchange CRM";
  }, []);

  const loadEATFiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("eat_parked_files")
        .select(`
          *,
          eat_llc:eat_llc_id (
            id,
            company_name
          ),
          exchangors:eat_exchangors (
            tax_account:tax_account_id (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEatFiles((data as EATParkedFile[]) || []);
    } catch (error) {
      console.error("Error loading EAT files:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadEATFiles();
  }, [loadEATFiles]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">EAT Parked Files</h1>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
            >
              + Create EAT
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
            ) : eatFiles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  No EAT files created yet
                </p>
                <Button onClick={() => setShowCreateModal(true)} variant="primary">
                  Create First EAT
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {eatFiles.map((eat) => (
                  <div
                    key={eat.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/eat/${eat.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {eat.eat_number}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                              eat.status
                            )}`}
                          >
                            {eat.status}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{eat.eat_name}</p>
                        
                        {eat.eat_llc && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">EAT LLC:</span> {eat.eat_llc.company_name}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">State:</span> {eat.state}
                        </p>

                        {eat.exchangors && eat.exchangors.length > 0 && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Exchangors:</span>{" "}
                            {eat.exchangors.map((ex) => ex.tax_account.name).join(", ")}
                          </p>
                        )}

                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Acquired Value</p>
                            <p className="font-medium text-gray-900">
                              ${eat.total_acquired_property_value?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Sale Value</p>
                            <p className="font-medium text-gray-900">
                              ${eat.total_sale_property_value?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Remaining</p>
                            <p className="font-medium text-gray-900">
                              ${eat.value_remaining?.toLocaleString() || "0"}
                            </p>
                          </div>
                        </div>

                        {(eat.day_45_date || eat.day_180_date) && (
                          <div className="flex gap-6 mt-3 text-sm">
                            {eat.day_45_date && (
                              <div>
                                <span className="text-gray-500">45 Day:</span>{" "}
                                <span className="font-medium">
                                  {new Date(eat.day_45_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {eat.day_180_date && (
                              <div>
                                <span className="text-gray-500">180 Day:</span>{" "}
                                <span className="font-medium">
                                  {new Date(eat.day_180_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create EAT Modal */}
      {showCreateModal && (
        <CreateEATModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(id) => {
            setShowCreateModal(false);
            router.push(`/eat/${id}`);
          }}
        />
      )}
    </div>
  );
}
