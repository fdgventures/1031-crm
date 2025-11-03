"use client";

import React, { useState, useRef, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";

interface WireInstructionModalProps {
  transactionId: string;
  entityType: "seller" | "buyer";
  entityId: string;
  taxUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function WireInstructionModal({
  transactionId,
  entityType,
  entityId,
  taxUserId,
  onClose,
  onSuccess,
}: WireInstructionModalProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [whoCalled, setWhoCalled] = useState("");
  const [whoSpokeTo, setWhoSpokeTo] = useState("");
  const [dateWritingInstructions, setDateWritingInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let filePath = null;

      // Upload file if exists
      if (file) {
        const uploadPath = `wire-instructions/${transactionId}/${Date.now()}-${
          file.name
        }`;
        const { error: uploadError } = await supabase.storage
          .from("document-files")
          .upload(uploadPath, file);

        if (uploadError) throw uploadError;
        filePath = uploadPath;
      }

      // Create wire instruction
      const wireData: any = {
        transaction_id: parseInt(transactionId),
        who_called: whoCalled || null,
        who_spoke_to: whoSpokeTo || null,
        date_writing_instructions: dateWritingInstructions || null,
        user_id: taxUserId,
        file_path: filePath,
      };

      if (entityType === "seller") {
        wireData.settlement_seller_id = entityId;
      } else {
        wireData.settlement_buyer_id = entityId;
      }

      const { error: insertError } = await supabase
        .from("wire_instructions")
        .insert(wireData);

      if (insertError) throw insertError;

      onSuccess();
    } catch (error) {
      console.error("Error creating wire instruction:", error);
      alert("Error creating wire instruction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <h3 className="text-lg font-semibold mb-4">Wiring Instructions</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who Called (Writing Instructions)
            </label>
            <input
              type="text"
              value={whoCalled}
              onChange={(e) => setWhoCalled(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who they spoke to (Writing Instructions)
            </label>
            <input
              type="text"
              value={whoSpokeTo}
              onChange={(e) => setWhoSpokeTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date (Writing Instructions)
            </label>
            <input
              type="date"
              value={dateWritingInstructions}
              onChange={(e) => setDateWritingInstructions(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                {file ? file.name : "Choose File"}
              </Button>
              {file && (
                <Button
                  type="button"
                  onClick={() => setFile(null)}
                  variant="outline"
                  size="small"
                >
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
