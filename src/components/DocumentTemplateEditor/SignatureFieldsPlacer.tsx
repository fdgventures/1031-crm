"use client";

import React, { useState, useEffect } from "react";
import {
  getTemplateSignatureFields,
  createTemplateSignatureField,
  updateTemplateSignatureField,
  deleteTemplateSignatureField,
} from "@/lib/document-templates";
import type { TemplateSignatureField } from "@/types/document.types";

interface SignatureFieldsPlacerProps {
  templateId: number;
}

export default function SignatureFieldsPlacer({
  templateId,
}: SignatureFieldsPlacerProps) {
  const [fields, setFields] = useState<TemplateSignatureField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, [templateId]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const data = await getTemplateSignatureFields(templateId);
      setFields(data);
    } catch (error) {
      console.error("Error loading signature fields:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    try {
      const newField = await createTemplateSignatureField({
        template_id: templateId,
        field_name: `Signature ${fields.length + 1}`,
        field_type: "signature",
        position_x: 50,
        position_y: 50,
        page_number: 1,
        width: 200,
        height: 60,
        is_required: true,
        signing_order: fields.length + 1,
      });
      setFields([...fields, newField]);
    } catch (error) {
      console.error("Error adding signature field:", error);
      alert("Error adding signature field");
    }
  };

  const handleUpdateField = async (
    id: number,
    updates: Partial<TemplateSignatureField>
  ) => {
    try {
      const updatedField = await updateTemplateSignatureField(id, updates);
      setFields(fields.map((f) => (f.id === id ? updatedField : f)));
    } catch (error) {
      console.error("Error updating signature field:", error);
    }
  };

  const handleDeleteField = async (id: number) => {
    if (!confirm("Delete this signature field?")) return;

    try {
      await deleteTemplateSignatureField(id);
      setFields(fields.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting signature field:", error);
      alert("Error deleting signature field");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Signature Fields
        </h3>
        <button
          onClick={handleAddField}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          + Add Field
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : fields.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No signature fields. Add your first field.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <div
              key={field.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={field.field_name}
                    onChange={(e) =>
                      handleUpdateField(field.id, { field_name: e.target.value })
                    }
                    className="font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 -mx-1"
                  />
                </div>
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Field Type
                  </label>
                  <select
                    value={field.field_type}
                    onChange={(e) =>
                      handleUpdateField(field.id, {
                        field_type: e.target.value as "signature" | "date" | "text",
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="signature">Signature</option>
                    <option value="date">Date</option>
                    <option value="text">Text</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Signing Order
                  </label>
                  <input
                    type="number"
                    value={field.signing_order}
                    onChange={(e) =>
                      handleUpdateField(field.id, {
                        signing_order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Signer Role
                  </label>
                  <input
                    type="text"
                    value={field.signer_role || ""}
                    onChange={(e) =>
                      handleUpdateField(field.id, { signer_role: e.target.value })
                    }
                    placeholder="admin, client, etc."
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.is_required}
                      onChange={(e) =>
                        handleUpdateField(field.id, {
                          is_required: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Required
                  </label>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Position: X: {field.position_x}mm, Y: {field.position_y}mm |
                  Size: {field.width}mm × {field.height}mm | Page:{" "}
                  {field.page_number}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        💡 Tip: After saving the template, you can drag-and-drop signature
        fields directly on the document when creating a document from the template.
      </div>
    </div>
  );
}

