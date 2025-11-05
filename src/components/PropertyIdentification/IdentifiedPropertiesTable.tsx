"use client";

import React, { useState } from "react";
import { IdentifiedProperty, PropertyImprovement } from "@/types/identified-property.types";
import { getSupabaseClient } from "@/lib/supabase";

interface IdentifiedPropertiesTableProps {
  properties: IdentifiedProperty[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
}

export default function IdentifiedPropertiesTable({
  properties,
  onUpdate,
  onDelete
}: IdentifiedPropertiesTableProps) {
  const supabase = getSupabaseClient();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingImprovement, setEditingImprovement] = useState<number | null>(null);
  const [newImprovement, setNewImprovement] = useState<{ [key: number]: { description: string; value: string } }>({});

  const toggleRow = (propertyId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedRows(newExpanded);
  };

  const handleUpdateField = async (propertyId: number, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("identified_properties")
        .update({ [field]: value })
        .eq("id", propertyId);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error("Failed to update property:", err);
      alert("Failed to update property");
    }
  };

  const handleAddImprovement = async (propertyId: number) => {
    const improvement = newImprovement[propertyId];
    if (!improvement?.description || !improvement?.value) {
      alert("Please enter description and value");
      return;
    }

    try {
      const { error } = await supabase
        .from("property_improvements")
        .insert({
          identified_property_id: propertyId,
          description: improvement.description,
          value: parseFloat(improvement.value)
        });

      if (error) throw error;
      
      setNewImprovement({ ...newImprovement, [propertyId]: { description: "", value: "" } });
      onUpdate();
    } catch (err) {
      console.error("Failed to add improvement:", err);
      alert("Failed to add improvement");
    }
  };

  const handleDeleteImprovement = async (improvementId: number) => {
    if (!confirm("Delete this improvement?")) return;

    try {
      const { error } = await supabase
        .from("property_improvements")
        .delete()
        .eq("id", improvementId);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error("Failed to delete improvement:", err);
      alert("Failed to delete improvement");
    }
  };

  const calculateTotalValue = (property: IdentifiedProperty) => {
    const baseValue = property.value || 0;
    const improvementsValue = property.improvements?.reduce((sum, imp) => sum + (imp.value || 0), 0) || 0;
    return baseValue + improvementsValue;
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No properties identified yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((property) => {
        const isExpanded = expandedRows.has(property.id);
        const totalValue = calculateTotalValue(property);

        return (
          <div key={property.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Main Property Row */}
            <div className="bg-white p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Description */}
                <div className="col-span-3">
                  <div className="text-xs text-gray-500 mb-1">Description</div>
                  <input
                    type="text"
                    value={property.description || ""}
                    onChange={(e) => handleUpdateField(property.id, "description", e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Property description"
                  />
                  {property.property && (
                    <div className="text-xs text-gray-500 mt-1">{property.property.address}</div>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <select
                    value={property.status}
                    onChange={(e) => handleUpdateField(property.id, "status", e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="identified">Identified</option>
                    <option value="under_contract">Under Contract</option>
                    <option value="acquired">Acquired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Percentage */}
                <div className="col-span-1">
                  <div className="text-xs text-gray-500 mb-1">%</div>
                  <input
                    type="number"
                    step="0.01"
                    value={property.percentage || ""}
                    onChange={(e) => handleUpdateField(property.id, "percentage", parseFloat(e.target.value) || null)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>

                {/* Value */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Base Value</div>
                  <input
                    type="number"
                    step="0.01"
                    value={property.value || ""}
                    onChange={(e) => handleUpdateField(property.id, "value", parseFloat(e.target.value) || null)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0.00"
                  />
                </div>

                {/* Total Value */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Total Value</div>
                  <div className="font-semibold text-gray-900">
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Date */}
                <div className="col-span-1">
                  <div className="text-xs text-gray-500 mb-1">Date</div>
                  <div className="text-sm text-gray-900">
                    {new Date(property.identification_date).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex gap-2 justify-end">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={property.is_parked}
                      onChange={(e) => handleUpdateField(property.id, "is_parked", e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-600">Parked</span>
                  </label>
                  
                  {property.improvements && property.improvements.length > 0 && (
                    <button
                      onClick={() => toggleRow(property.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {isExpanded ? "▼" : "▶"} ({property.improvements.length})
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDelete(property.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete property"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            {/* Improvements Section */}
            {isExpanded && (
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Improvements</h4>
                
                <div className="space-y-2 mb-3">
                  {property.improvements?.map((improvement) => (
                    <div key={improvement.id} className="flex items-center gap-3 bg-white p-2 rounded">
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">{improvement.description}</div>
                      </div>
                      <div className="w-32 text-right font-semibold text-sm text-gray-900">
                        ${improvement.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <button
                        onClick={() => handleDeleteImprovement(improvement.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Improvement */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newImprovement[property.id]?.description || ""}
                    onChange={(e) => setNewImprovement({
                      ...newImprovement,
                      [property.id]: { ...newImprovement[property.id], description: e.target.value }
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Improvement description"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newImprovement[property.id]?.value || ""}
                    onChange={(e) => setNewImprovement({
                      ...newImprovement,
                      [property.id]: { ...newImprovement[property.id], value: e.target.value }
                    })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Value"
                  />
                  <button
                    onClick={() => handleAddImprovement(property.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

