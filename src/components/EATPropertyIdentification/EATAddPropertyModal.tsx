"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import { createEATIdentifiedProperty } from "@/lib/eat-identified-properties";

interface EATAddPropertyModalProps {
  eatParkedFileId: number;
  identificationType: "written_form" | "by_contract";
  onClose: () => void;
  onSuccess: () => void;
}

interface Property {
  id: number;
  address: string;
}

export default function EATAddPropertyModal({
  eatParkedFileId,
  identificationType,
  onClose,
  onSuccess,
}: EATAddPropertyModalProps) {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [propertyType, setPropertyType] = useState<
    "standard_address" | "dst" | "membership_interest"
  >("standard_address");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [percentage, setPercentage] = useState("");
  const [identificationDate, setIdentificationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isParked, setIsParked] = useState(false);

  // Available properties
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select("id, address")
      .order("address");

    setProperties(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (propertyType === "standard_address" && !selectedPropertyId) {
      setError("Please select a property");
      return;
    }

    if (
      (propertyType === "dst" || propertyType === "membership_interest") &&
      !description.trim()
    ) {
      setError("Please enter a description");
      return;
    }

    setLoading(true);

    const result = await createEATIdentifiedProperty({
      eat_parked_file_id: eatParkedFileId,
      property_id: propertyType === "standard_address" ? selectedPropertyId! : undefined,
      identification_type: identificationType,
      property_type: propertyType,
      description: description || undefined,
      value: value ? parseFloat(value) : undefined,
      percentage: percentage ? parseFloat(percentage) : undefined,
      identification_date: identificationDate,
      is_parked: isParked,
      status: "identified",
    });

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to add property");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Add Identified Property
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Type:</strong>{" "}
              {identificationType === "written_form"
                ? "Written Identification Form"
                : "Identified by Contract"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                value={propertyType}
                onChange={(e) =>
                  setPropertyType(
                    e.target.value as
                      | "standard_address"
                      | "dst"
                      | "membership_interest"
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="standard_address">Standard Address</option>
                <option value="dst">DST (Delaware Statutory Trust)</option>
                <option value="membership_interest">
                  100% Membership Interest
                </option>
              </select>
            </div>

            {/* Property Selection (for standard_address) */}
            {propertyType === "standard_address" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Property *
                </label>
                <select
                  value={selectedPropertyId || ""}
                  onChange={(e) =>
                    setSelectedPropertyId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="">Select property...</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description (for DST and Membership Interest) */}
            {(propertyType === "dst" ||
              propertyType === "membership_interest") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter property description"
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Value
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>

            {/* Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Percentage (%)
              </label>
              <input
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="100"
                step="0.01"
                min="0"
                max="100"
                disabled={loading}
              />
            </div>

            {/* Identification Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identification Date *
              </label>
              <input
                type="date"
                value={identificationDate}
                onChange={(e) => setIdentificationDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            {/* Is Parked */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isParked"
                checked={isParked}
                onChange={(e) => setIsParked(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label
                htmlFor="isParked"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                Property is Parked
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Property"}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

