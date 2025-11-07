"use client";

import React, { useState, useEffect } from "react";
import { fetchDocumentRepository, uploadFileToFolder, ensureDocumentRepository } from "@/lib/document-repository";
import type { DocumentFolderNode, DocumentEntityType } from "@/lib/document-repository";

interface FolderSelectModalProps {
  entityType: DocumentEntityType;
  entityId: string;
  documentName: string;
  documentContent: string; // HTML content
  onClose: () => void;
  onSuccess: () => void;
}

export default function FolderSelectModal({
  entityType,
  entityId,
  documentName,
  documentContent,
  onClose,
  onSuccess,
}: FolderSelectModalProps) {
  const [folders, setFolders] = useState<DocumentFolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const tree = await fetchDocumentRepository(entityType, entityId);
      setFolders(tree.rootFolders);
    } catch (err) {
      console.error("Error loading folders:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAllFolders = (nodes: DocumentFolderNode[], level = 0): Array<{ id: string; name: string; level: number }> => {
    const result: Array<{ id: string; name: string; level: number }> = [];
    
    nodes.forEach((node) => {
      result.push({ id: node.id, name: node.name, level });
      if (node.children.length > 0) {
        result.push(...getAllFolders(node.children, level + 1));
      }
    });
    
    return result;
  };

  const handleSave = async () => {
    if (!selectedFolderId) {
      alert("Please select a folder");
      return;
    }

    try {
      setSaving(true);

      // Convert HTML content to a text file
      const blob = new Blob([documentContent], { type: "text/html" });
      const file = new File([blob], `${documentName}.html`, { type: "text/html" });

      // Ensure repository exists
      const repositoryId = await ensureDocumentRepository(entityType, entityId);

      // Upload file to selected folder
      await uploadFileToFolder(
        repositoryId,
        selectedFolderId === "root" ? null : selectedFolderId,
        file
      );

      alert("Document saved to repository successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving to repository:", err);
      alert("Error saving to repository: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const flatFolders = getAllFolders(folders);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Save to Document Repository
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Select a folder to save <strong>{documentName}</strong>
          </p>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading folders...</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {/* Root option */}
              <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="folder"
                  value="root"
                  checked={selectedFolderId === "root"}
                  onChange={() => setSelectedFolderId("root")}
                  className="mr-3"
                />
                <span className="font-medium">📁 Root Folder</span>
              </label>

              {/* All folders */}
              {flatFolders.map((folder) => (
                <label
                  key={folder.id}
                  className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  style={{ paddingLeft: `${0.5 + folder.level * 1.5}rem` }}
                >
                  <input
                    type="radio"
                    name="folder"
                    value={folder.id}
                    checked={selectedFolderId === folder.id}
                    onChange={() => setSelectedFolderId(folder.id)}
                    className="mr-3"
                  />
                  <span>
                    {"  ".repeat(folder.level)}📁 {folder.name}
                  </span>
                </label>
              ))}

              {flatFolders.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No folders found. File will be saved to root.
                </div>
              )}
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
            onClick={handleSave}
            disabled={saving || !selectedFolderId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save to Repository"}
          </button>
        </div>
      </div>
    </div>
  );
}

