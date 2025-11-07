"use client";

import React, { useState, useEffect } from "react";
import type { DocumentTemplate } from "@/types/document.types";
import { getDynamicFieldsForType } from "@/types/document.types";

interface TransactionData {
  transaction_number?: string;
  contract_purchase_price?: number;
  contract_date?: string;
  sale_type?: string;
  sellers?: Array<{
    vesting_name?: string | null;
    non_exchange_name?: string | null;
  }>;
  buyers?: Array<{
    non_exchange_name?: string | null;
    profile?: {
      first_name: string;
      last_name: string;
    };
  }>;
  properties?: Array<{
    address: string;
  }>;
  closing_agent?: {
    first_name: string;
    last_name: string;
  };
}

interface FillTemplateModalProps {
  template: DocumentTemplate;
  transactionData: TransactionData;
  onSubmit: (filledData: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

export default function FillTemplateModal({
  template,
  transactionData,
  onSubmit,
  onClose,
}: FillTemplateModalProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dynamicFields = getDynamicFieldsForType(template.template_type);

  // Pre-fill fields with transaction data
  useEffect(() => {
    console.log("=== FillTemplateModal Debug ===");
    console.log("Transaction Data:", transactionData);
    console.log("Template:", template);
    console.log("Dynamic Fields:", dynamicFields);

    const prefilled: Record<string, string> = {};

    // Map transaction data to dynamic fields
    const fieldMappings: Record<string, string> = {
      "<<transaction number>>": transactionData?.transaction_number || "",
      "<<contract price>>": transactionData?.contract_purchase_price
        ? `$${transactionData.contract_purchase_price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "",
      "<<contract date>>": transactionData?.contract_date
        ? new Date(transactionData.contract_date).toLocaleDateString()
        : "",
      "<<sale type>>": transactionData?.sale_type || "",
      "<<seller name>>": transactionData?.sellers && transactionData.sellers.length > 0
        ? transactionData.sellers
            .map((s) => s.vesting_name || s.non_exchange_name)
            .filter((n) => n)
            .join(", ")
        : "",
      "<<buyer name>>": transactionData?.buyers && transactionData.buyers.length > 0
        ? transactionData.buyers
            .map((b) => b.non_exchange_name || (b.profile ? `${b.profile.first_name} ${b.profile.last_name}` : "Exchange Buyer"))
            .filter((n) => n)
            .join(", ")
        : "",
      "<<property address>>": transactionData?.properties && transactionData.properties.length > 0
        ? transactionData.properties[0].address
        : "",
      "<<closing agent>>": transactionData?.closing_agent
        ? `${transactionData.closing_agent.first_name} ${transactionData.closing_agent.last_name}`
        : "",
    };

    console.log("Field Mappings:", fieldMappings);

    // Fill only fields that exist in the template
    dynamicFields.forEach((field) => {
      if (fieldMappings[field.placeholder] !== undefined) {
        prefilled[field.placeholder] = fieldMappings[field.placeholder];
        console.log(`Prefilled ${field.placeholder} = ${fieldMappings[field.placeholder]}`);
      }
    });

    console.log("Final prefilled values:", prefilled);
    setFieldValues(prefilled);
  }, [template, transactionData, dynamicFields]);

  const handleSubmit = async () => {
    console.log("Submitting with field values:", fieldValues);
    setIsSubmitting(true);
    try {
      await onSubmit(fieldValues);
    } catch (error) {
      console.error("Error submitting filled template:", error);
      alert("Error creating document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Fill Template Data
            </h3>
            <p className="text-sm text-gray-500 mt-1">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Fields are pre-filled with transaction data. You can modify them
              before creating the document.
            </p>
          </div>

          <div className="space-y-4">
            {dynamicFields.map((field) => (
              <div key={field.placeholder}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  <span className="text-xs text-gray-500 ml-2">
                    {field.placeholder}
                  </span>
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    value={fieldValues[field.placeholder] || ""}
                    onChange={(e) =>
                      setFieldValues({
                        ...fieldValues,
                        [field.placeholder]: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={fieldValues[field.placeholder] || ""}
                    onChange={(e) =>
                      setFieldValues({
                        ...fieldValues,
                        [field.placeholder]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>

          {dynamicFields.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              This template has no dynamic fields to fill.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

