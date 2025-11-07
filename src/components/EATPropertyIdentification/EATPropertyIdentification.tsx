"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getEATIdentifiedProperties,
  deleteEATIdentifiedProperty,
  updateEATIdentifiedProperty,
  addEATPropertyImprovement,
  deleteEATPropertyImprovement,
  type EATIdentifiedProperty,
} from "@/lib/eat-identified-properties";
import { calculateExchangeRule } from "@/lib/exchange-rules";
import { type IdentifiedProperty } from "@/types/identified-property.types";
import ExchangeRuleIndicator from "../PropertyIdentification/ExchangeRuleIndicator";
import EATAddPropertyModal from "./EATAddPropertyModal";

interface EATPropertyIdentificationProps {
  eatParkedFileId: number;
  totalSalePropertyValue: number;
}

export default function EATPropertyIdentification({
  eatParkedFileId,
  totalSalePropertyValue,
}: EATPropertyIdentificationProps) {
  const supabase = getSupabaseClient();
  const [writtenFormProperties, setWrittenFormProperties] = useState<
    EATIdentifiedProperty[]
  >([]);
  const [contractProperties, setContractProperties] = useState<
    EATIdentifiedProperty[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<
    "written_form" | "by_contract" | null
  >(null);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);

      const properties = await getEATIdentifiedProperties(eatParkedFileId);

      setWrittenFormProperties(
        properties.filter((p) => p.identification_type === "written_form")
      );
      setContractProperties(
        properties.filter((p) => p.identification_type === "by_contract")
      );
    } catch (err) {
      console.error("Failed to load EAT identified properties:", err);
    } finally {
      setLoading(false);
    }
  }, [eatParkedFileId]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleDelete = async (propertyId: number) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    const success = await deleteEATIdentifiedProperty(propertyId);
    if (success) {
      await loadProperties();
    }
  };

  const handleUpdate = async (
    propertyId: number,
    updates: Partial<EATIdentifiedProperty>
  ) => {
    const success = await updateEATIdentifiedProperty(propertyId, updates);
    if (success) {
      await loadProperties();
    }
  };

  const handleAddImprovement = async (
    propertyId: number,
    description: string,
    value: number
  ) => {
    const success = await addEATPropertyImprovement(
      propertyId,
      description,
      value
    );
    if (success) {
      await loadProperties();
    }
  };

  const handleDeleteImprovement = async (improvementId: number) => {
    if (!confirm("Delete this improvement?")) return;

    const success = await deleteEATPropertyImprovement(improvementId);
    if (success) {
      await loadProperties();
    }
  };

  const calculateTotalValue = (property: EATIdentifiedProperty): number => {
    const baseValue = property.value || 0;
    const improvementsValue =
      property.improvements?.reduce((sum, imp) => sum + imp.value, 0) || 0;
    return baseValue + improvementsValue;
  };

  const renderPropertiesTable = (
    properties: EATIdentifiedProperty[],
    title: string
  ) => {
    if (properties.length === 0) {
      return (
        <p className="text-gray-500 text-sm text-center py-4">
          No properties identified yet
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.map((property) => (
              <tr key={property.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div>
                    {property.property ? (
                      <p className="font-medium">{property.property.address}</p>
                    ) : (
                      <p className="text-gray-500 italic">
                        {property.description || "No description"}
                      </p>
                    )}
                    {property.is_parked && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        Parked
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {property.property_type === "standard_address"
                    ? "Standard"
                    : property.property_type === "dst"
                    ? "DST"
                    : "Membership Interest"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div>
                    <p className="font-semibold">
                      ${calculateTotalValue(property).toLocaleString()}
                    </p>
                    {property.improvements && property.improvements.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Base: ${property.value?.toLocaleString() || 0} +
                        Improvements: $
                        {property.improvements
                          .reduce((sum, imp) => sum + imp.value, 0)
                          .toLocaleString()}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      property.status === "acquired"
                        ? "bg-green-100 text-green-800"
                        : property.status === "under_contract"
                        ? "bg-blue-100 text-blue-800"
                        : property.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {property.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Date(property.identification_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Calculate rule status for all properties combined
  const allProperties = [...writtenFormProperties, ...contractProperties];
  const ruleStatus = calculateExchangeRule(allProperties as unknown as IdentifiedProperty[], totalSalePropertyValue);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Identified Properties
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Identify replacement properties for the exchange
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Rule Indicator */}
        <ExchangeRuleIndicator ruleStatus={ruleStatus} />
        {/* Written Identification Form */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Written Identification Form
            </h3>
            <Button
              onClick={() => setShowModal("written_form")}
              variant="outline"
              size="small"
            >
              + Add Property
            </Button>
          </div>
          {renderPropertiesTable(writtenFormProperties, "Written Form")}
        </div>

        {/* Identified by Contract */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Identified by Contract
            </h3>
            <Button
              onClick={() => setShowModal("by_contract")}
              variant="outline"
              size="small"
            >
              + Add Property
            </Button>
          </div>
          {renderPropertiesTable(contractProperties, "By Contract")}
        </div>

        {/* Summary */}
        <div className="pt-6 border-t border-gray-200 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Total Properties</p>
              <p className="text-lg font-bold text-gray-900">
                {writtenFormProperties.length + contractProperties.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Value</p>
              <p className="text-lg font-bold text-gray-900">
                $
                {[...writtenFormProperties, ...contractProperties]
                  .reduce((sum, p) => sum + calculateTotalValue(p), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Property Modal */}
      {showModal && (
        <EATAddPropertyModal
          eatParkedFileId={eatParkedFileId}
          identificationType={showModal}
          onClose={() => setShowModal(null)}
          onSuccess={() => {
            setShowModal(null);
            loadProperties();
          }}
        />
      )}
    </div>
  );
}

