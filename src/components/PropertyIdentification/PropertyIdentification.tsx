"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import { IdentifiedProperty } from "@/types/identified-property.types";
import { calculateExchangeRule } from "@/lib/exchange-rules";
import ExchangeRuleIndicator from "./ExchangeRuleIndicator";
import IdentifiedPropertiesTable from "./IdentifiedPropertiesTable";
import AddPropertyModal from "./AddPropertyModal";

interface PropertyIdentificationProps {
  exchangeId: number;
  totalSalePropertyValue: number;
}

export default function PropertyIdentification({
  exchangeId,
  totalSalePropertyValue
}: PropertyIdentificationProps) {
  const supabase = getSupabaseClient();
  const [writtenFormProperties, setWrittenFormProperties] = useState<IdentifiedProperty[]>([]);
  const [contractProperties, setContractProperties] = useState<IdentifiedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<'written_form' | 'by_contract' | null>(null);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("identified_properties")
        .select(`
          *,
          property:property_id (
            id,
            address
          ),
          improvements:property_improvements (
            id,
            identified_property_id,
            description,
            value,
            created_at,
            updated_at
          )
        `)
        .eq("exchange_id", exchangeId)
        .order("identification_date", { ascending: false });

      if (error) throw error;

      const properties = (data || []) as IdentifiedProperty[];
      
      setWrittenFormProperties(properties.filter(p => p.identification_type === 'written_form'));
      setContractProperties(properties.filter(p => p.identification_type === 'by_contract'));
    } catch (err) {
      console.error("Failed to load identified properties:", err);
    } finally {
      setLoading(false);
    }
  }, [exchangeId, supabase]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleDelete = async (propertyId: number) => {
    if (!confirm("Delete this identified property?")) return;

    try {
      const { error } = await supabase
        .from("identified_properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;
      await loadProperties();
    } catch (err) {
      console.error("Failed to delete property:", err);
      alert("Failed to delete property");
    }
  };

  // Calculate rule status for all properties combined
  const allProperties = [...writtenFormProperties, ...contractProperties];
  const ruleStatus = calculateExchangeRule(allProperties, totalSalePropertyValue);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading property identification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Property Identification - 1031 Exchange
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Identify replacement properties within 45 days of closing
        </p>
      </div>

      <div className="p-6">
        {/* Rule Indicator */}
        <ExchangeRuleIndicator ruleStatus={ruleStatus} />

        {/* Written Identification Form Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Written Identification Form
              </h3>
              <p className="text-sm text-gray-600">
                Properties identified through written documentation
              </p>
            </div>
            <Button
              onClick={() => setShowModal('written_form')}
              variant="primary"
            >
              + Add Property
            </Button>
          </div>

          <IdentifiedPropertiesTable
            properties={writtenFormProperties}
            onUpdate={loadProperties}
            onDelete={handleDelete}
          />
        </div>

        {/* Identified by Contract Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Identified by Contract
              </h3>
              <p className="text-sm text-gray-600">
                Properties under contract (automatically identified)
              </p>
            </div>
            <Button
              onClick={() => setShowModal('by_contract')}
              variant="primary"
            >
              + Add Property
            </Button>
          </div>

          <IdentifiedPropertiesTable
            properties={contractProperties}
            onUpdate={loadProperties}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Add Property Modal */}
      {showModal && (
        <AddPropertyModal
          exchangeId={exchangeId}
          identificationType={showModal}
          onClose={() => setShowModal(null)}
          onSuccess={loadProperties}
        />
      )}
    </div>
  );
}

