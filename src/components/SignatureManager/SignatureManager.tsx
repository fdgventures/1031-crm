"use client";

import React, { useState, useEffect } from "react";
import {
  getVestingNameSignatures,
  createVestingNameSignature,
  updateVestingNameSignature,
  deleteVestingNameSignature,
} from "@/lib/document-templates";
import type {
  VestingNameSignature,
  SignatureType,
} from "@/types/document.types";
import { SIGNATURE_FONTS } from "@/types/document.types";

interface SignatureManagerProps {
  taxAccountId: number;
  vestingNames: string[];
}

export default function SignatureManager({
  taxAccountId,
  vestingNames,
}: SignatureManagerProps) {
  const [signatures, setSignatures] = useState<VestingNameSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSignature, setEditingSignature] = useState<VestingNameSignature | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [selectedVestingName, setSelectedVestingName] = useState("");
  const [signatureType, setSignatureType] = useState<SignatureType>("property");
  const [signatureText, setSignatureText] = useState("");
  const [signatureFont, setSignatureFont] = useState("Brush Script MT");
  const [printedName, setPrintedName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [byName, setByName] = useState("");
  const [itsTitle, setItsTitle] = useState("");

  useEffect(() => {
    loadSignatures();
  }, [taxAccountId]);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const data = await getVestingNameSignatures(taxAccountId);
      setSignatures(data);
    } catch (error) {
      console.error("Error loading signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedVestingName("");
    setSignatureType("property");
    setSignatureText("");
    setSignatureFont("Brush Script MT");
    setPrintedName("");
    setEntityName("");
    setByName("");
    setItsTitle("");
    setEditingSignature(null);
    setIsCreating(false);
  };

  const handleEdit = (signature: VestingNameSignature) => {
    setEditingSignature(signature);
    setSelectedVestingName(signature.vesting_name);
    setSignatureType(signature.signature_type);
    setSignatureText(signature.signature_text);
    setSignatureFont(signature.signature_font);
    setPrintedName(signature.printed_name || "");
    setEntityName(signature.entity_name || "");
    setByName(signature.by_name || "");
    setItsTitle(signature.its_title || "");
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!selectedVestingName || !signatureText) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const signatureData: Partial<VestingNameSignature> = {
        tax_account_id: taxAccountId,
        vesting_name: selectedVestingName,
        signature_type: signatureType,
        signature_text: signatureText,
        signature_font: signatureFont,
        printed_name: signatureType === "property" ? printedName : undefined,
        entity_name: signatureType === "entity" ? entityName : undefined,
        by_name: signatureType === "entity" ? byName : undefined,
        its_title: signatureType === "entity" ? itsTitle : undefined,
      };

      if (editingSignature) {
        await updateVestingNameSignature(editingSignature.id, signatureData);
      } else {
        await createVestingNameSignature(signatureData);
      }

      await loadSignatures();
      resetForm();
    } catch (error) {
      console.error("Error saving signature:", error);
      alert("Error saving signature");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this signature?")) return;

    try {
      await deleteVestingNameSignature(id);
      await loadSignatures();
    } catch (error) {
      console.error("Error deleting signature:", error);
      alert("Error deleting signature");
    }
  };

  const renderSignaturePreview = () => {
    if (!signatureText) return null;

    return (
      <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-3">
          Signature Preview:
        </div>
        <div className="bg-white p-4 rounded border border-gray-200">
          {signatureType === "property" ? (
            <div>
              <div
                style={{ fontFamily: signatureFont, fontSize: "24px" }}
                className="text-center mb-2"
              >
                {signatureText}
              </div>
              {printedName && (
                <div className="text-center text-sm border-t border-gray-300 pt-2">
                  {printedName}
                  <div className="text-xs text-gray-500">Printed Name</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {entityName && (
                <div className="text-center font-semibold mb-2">
                  {entityName}
                </div>
              )}
              <div
                style={{ fontFamily: signatureFont, fontSize: "24px" }}
                className="text-center mb-2"
              >
                {signatureText}
              </div>
              <div className="text-sm">
                {byName && (
                  <div className="mb-1">
                    <span className="font-medium">BY:</span> {byName}
                  </div>
                )}
                {itsTitle && (
                  <div>
                    <span className="font-medium">ITS:</span> {itsTitle}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Signature Management
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Create digital signatures for your vesting names
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Signature
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingSignature ? "Edit Signature" : "Create New Signature"}
          </h4>

          <div className="space-y-4">
            {/* Vesting Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vesting Name *
              </label>
              <select
                value={selectedVestingName}
                onChange={(e) => setSelectedVestingName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!editingSignature}
              >
                <option value="">Select vesting name</option>
                {vestingNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Signature Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signature Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="property"
                    checked={signatureType === "property"}
                    onChange={(e) => setSignatureType(e.target.value as SignatureType)}
                    className="mr-2"
                  />
                  <span>Property</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="entity"
                    checked={signatureType === "entity"}
                    onChange={(e) => setSignatureType(e.target.value as SignatureType)}
                    className="mr-2"
                  />
                  <span>Entity</span>
                </label>
              </div>
            </div>

            {/* Signature Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signature Text *
              </label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your signature"
              />
            </div>

            {/* Signature Font */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signature Font
              </label>
              <select
                value={signatureFont}
                onChange={(e) => setSignatureFont(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SIGNATURE_FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Type Fields */}
            {signatureType === "property" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Printed Name
                </label>
                <input
                  type="text"
                  value={printedName}
                  onChange={(e) => setPrintedName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name"
                />
              </div>
            )}

            {/* Entity Type Fields */}
            {signatureType === "entity" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity Name
                  </label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BY (signer name)
                  </label>
                  <input
                    type="text"
                    value={byName}
                    onChange={(e) => setByName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ITS (title/position)
                  </label>
                  <input
                    type="text"
                    value={itsTitle}
                    onChange={(e) => setItsTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Manager, President, etc."
                  />
                </div>
              </>
            )}

            {/* Preview */}
            {renderSignaturePreview()}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signatures List */}
      {!isCreating && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : signatures.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No signatures created. Create your first signature.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {signatures.map((signature) => (
                <div key={signature.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {signature.vesting_name}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Type: {signature.signature_type} | ID: {signature.signature_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(signature)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(signature.id)}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Signature Preview */}
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    {signature.signature_type === "property" ? (
                      <div>
                        <div
                          style={{
                            fontFamily: signature.signature_font,
                            fontSize: "20px",
                          }}
                          className="text-center mb-2"
                        >
                          {signature.signature_text}
                        </div>
                        {signature.printed_name && (
                          <div className="text-center text-sm border-t border-gray-300 pt-2 mt-2">
                            {signature.printed_name}
                            <div className="text-xs text-gray-500">Printed Name</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {signature.entity_name && (
                          <div className="text-center font-semibold mb-2">
                            {signature.entity_name}
                          </div>
                        )}
                        <div
                          style={{
                            fontFamily: signature.signature_font,
                            fontSize: "20px",
                          }}
                          className="text-center mb-2"
                        >
                          {signature.signature_text}
                        </div>
                        <div className="text-sm">
                          {signature.by_name && (
                            <div className="mb-1">
                              <span className="font-medium">BY:</span>{" "}
                              {signature.by_name}
                            </div>
                          )}
                          {signature.its_title && (
                            <div>
                              <span className="font-medium">ITS:</span>{" "}
                              {signature.its_title}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

