"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import {
  createEATInvoice,
  updateEATInvoice,
  getEATAcquisitionProperties,
  type CreateEATInvoiceInput,
  type EATInvoiceWithItems,
} from "@/lib/eat-invoices";

interface EATInvoiceModalProps {
  eatParkedFileId: number;
  invoice?: EATInvoiceWithItems | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceItemForm {
  id?: number;
  property_id: number | null;
  description: string;
  amount: string;
}

export default function EATInvoiceModal({
  eatParkedFileId,
  invoice,
  onClose,
  onSuccess,
}: EATInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invoice fields
  const [invoiceType, setInvoiceType] = useState<
    "Invoice paid through exchange" | "Invoice paid outside of exchange"
  >("Invoice paid through exchange");
  const [paidTo, setPaidTo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Invoice items
  const [items, setItems] = useState<InvoiceItemForm[]>([]);

  // Available properties from EAT Acquisition
  const [availableProperties, setAvailableProperties] = useState<
    Array<{ id: number; address: string }>
  >([]);

  const isEditMode = Boolean(invoice);

  useEffect(() => {
    loadAvailableProperties();
    
    if (invoice) {
      // Populate form with existing invoice data
      setInvoiceType(invoice.invoice_type);
      setPaidTo(invoice.paid_to);
      setInvoiceDate(invoice.invoice_date);
      setInvoiceNumber(invoice.invoice_number || "");
      
      // Set items
      setItems(
        invoice.items.map((item) => ({
          id: item.id,
          property_id: item.property_id,
          description: item.description,
          amount: item.amount.toString(),
        }))
      );
    }
  }, [invoice, eatParkedFileId]);

  const loadAvailableProperties = async () => {
    const props = await getEATAcquisitionProperties(eatParkedFileId);
    setAvailableProperties(props);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        property_id: null,
        description: "",
        amount: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemForm,
    value: string | number | null
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!paidTo.trim()) {
      setError("Please enter Paid To");
      return;
    }
    if (!invoiceDate) {
      setError("Please select Invoice Date");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one invoice item");
      return;
    }

    // Validate all items have description and amount
    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim()) {
        setError(`Item ${i + 1}: Description is required`);
        return;
      }
      if (!items[i].amount || parseFloat(items[i].amount) <= 0) {
        setError(`Item ${i + 1}: Amount must be greater than 0`);
        return;
      }
    }

    setLoading(true);

    if (isEditMode && invoice) {
      // Update existing invoice
      // Note: For simplicity, we're not updating items in edit mode
      // You can extend this to handle item updates
      const success = await updateEATInvoice(invoice.id, {
        invoice_type: invoiceType,
        paid_to: paidTo,
        invoice_date: invoiceDate,
        invoice_number: invoiceNumber || undefined,
      });

      setLoading(false);

      if (success) {
        onSuccess();
      } else {
        setError("Failed to update invoice");
      }
    } else {
      // Create new invoice
      const result = await createEATInvoice({
        eat_parked_file_id: eatParkedFileId,
        invoice_type: invoiceType,
        paid_to: paidTo,
        invoice_date: invoiceDate,
        invoice_number: invoiceNumber || undefined,
        items: items.map((item) => ({
          property_id: item.property_id || undefined,
          description: item.description,
          amount: parseFloat(item.amount),
        })),
      });

      setLoading(false);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to create invoice");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Edit Invoice" : "Add Invoice"}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Invoice Information */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invoice Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoice Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Invoice *
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) =>
                      setInvoiceType(
                        e.target.value as
                          | "Invoice paid through exchange"
                          | "Invoice paid outside of exchange"
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  >
                    <option value="Invoice paid through exchange">
                      Invoice paid through exchange
                    </option>
                    <option value="Invoice paid outside of exchange">
                      Invoice paid outside of exchange
                    </option>
                  </select>
                </div>

                {/* Paid To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid To *
                  </label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter payee name"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Invoice Items */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Invoice Items
                </h3>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  variant="outline"
                  size="small"
                  disabled={loading}
                >
                  + Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No items added yet. Click &quot;Add Item&quot; to add invoice items.
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Item {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Property Selection */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Invoice Property
                          </label>
                          <select
                            value={item.property_id || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "property_id",
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                          >
                            <option value="">Select property...</option>
                            {availableProperties.map((prop) => (
                              <option key={prop.id} value={prop.id}>
                                {prop.address}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(index, "description", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Item description"
                            required
                            disabled={loading}
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Amount *
                          </label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) =>
                              handleItemChange(index, "amount", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Amount */}
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    ${calculateTotal().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : isEditMode
                  ? "Update Invoice"
                  : "Create Invoice"}
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

