"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Property {
  id: number;
  address: string;
  created_at: string;
  updated_at: string;
}

export default function PropertyViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperty();
  }, [resolvedParams.id]);

  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (err: any) {
      console.error("Failed to load property:", err);
      setError(err.message || "Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Property
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "Property not found"}
            </p>
            <Button
              onClick={() => router.push("/properties")}
              variant="primary"
            >
              Back to Properties
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/properties")} variant="outline">
            ← Back to Properties
          </Button>
        </div>

        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 rounded-t-lg">
            <div className="flex items-center">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mr-6">
                <span className="text-3xl font-bold text-blue-600">🏠</span>
              </div>
              <div className="text-white">
                <h1 className="text-4xl font-bold">Property #{property.id}</h1>
                <p className="text-blue-100 mt-2">Real Estate Property</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-b pb-4 md:border-b-0 md:pb-0 md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Address
                </h3>
                <p className="text-lg text-gray-900">{property.address}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500">
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(property.created_at).toLocaleString()}
                </div>
                <div className="mt-2 sm:mt-0">
                  <strong>Updated:</strong>{" "}
                  {new Date(property.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
