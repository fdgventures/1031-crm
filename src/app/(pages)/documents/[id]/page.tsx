"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getDocumentById, updateDocument } from "@/lib/document-templates";
import type { Document } from "@/types/document.types";
import FolderSelectModal from "@/components/TransactionDocuments/FolderSelectModal";

export default function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const supabase = getSupabaseClient();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocumentById(parseInt(id));
      setDocument(data);
      setEditedName(data.document_name);
      const htmlContent =
        typeof data.content === "object" && "html" in data.content
          ? (data.content.html as string)
          : "";
      setEditedContent(htmlContent);
    } catch (err) {
      console.error("Error loading document:", err);
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!document || !editedName.trim()) return;

    try {
      await updateDocument(document.id, { document_name: editedName });
      setDocument({ ...document, document_name: editedName });
      setIsEditingName(false);
    } catch (err) {
      console.error("Error updating document name:", err);
      alert("Error updating document name");
    }
  };

  const handleUpdateStatus = async (newStatus: Document["status"]) => {
    if (!document) return;

    try {
      await updateDocument(document.id, { status: newStatus });
      setDocument({ ...document, status: newStatus });
    } catch (err) {
      console.error("Error updating document status:", err);
      alert("Error updating document status");
    }
  };

  const handleSaveContent = async () => {
    if (!document) return;

    try {
      setIsSaving(true);
      await updateDocument(document.id, {
        content: { html: editedContent },
      });
      setDocument({
        ...document,
        content: { html: editedContent },
      });
      setIsEditingContent(false);
      alert("Document saved successfully!");
    } catch (err) {
      console.error("Error saving document content:", err);
      alert("Error saving document content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToRepository = async () => {
    if (!document) return;
    setShowFolderSelectModal(true);
  };

  const handleDeleteDocument = async () => {
    if (!document) return;

    if (
      !confirm(
        `Are you sure you want to delete "${document.document_name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;

      alert("Document deleted successfully!");
      router.back();
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Error deleting document");
    }
  };

  const formatText = (command: string) => {
    window.document.execCommand(command, false);
  };

  const updateEditedContent = (e: React.FormEvent<HTMLDivElement>) => {
    setEditedContent(e.currentTarget.innerHTML);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      pending_signatures: {
        label: "Pending Signatures",
        className: "bg-yellow-100 text-yellow-800",
      },
      partially_signed: {
        label: "Partially Signed",
        className: "bg-blue-100 text-blue-800",
      },
      fully_signed: {
        label: "Fully Signed",
        className: "bg-green-100 text-green-800",
      },
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-800",
      },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Document not found
          </h2>
          <p className="mt-2 text-gray-600">
            {error || "The document you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(document.document_name);
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {document.document_name}
                  </h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                <span>Document #: {document.document_number}</span>
                <span>•</span>
                <span>
                  Created: {new Date(document.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(document.status)}
              {document.template && (
                <span className="text-sm text-gray-500">
                  Template: {document.template.name}
                </span>
              )}
              <button
                onClick={handleDeleteDocument}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete Document"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>

        {/* Status Change */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Document Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              "draft",
              "pending_signatures",
              "partially_signed",
              "fully_signed",
              "completed",
              "cancelled",
            ].map((status) => (
              <button
                key={status}
                onClick={() => handleUpdateStatus(status as Document["status"])}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  document.status === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </button>
            ))}
          </div>
        </div>

        {/* Document Content (A4 Preview) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Document Content
            </h3>
            <div className="flex items-center gap-2">
              {!isEditingContent ? (
                <>
                  <button
                    onClick={() => setIsEditingContent(true)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={handleSaveToRepository}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    💾 Save to Repository
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    🖨️ Print
                  </button>
                  {document.pdf_url && (
                    <a
                      href={document.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      📄 Download PDF
                    </a>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditingContent(false);
                      const htmlContent =
                        typeof document.content === "object" &&
                        "html" in document.content
                          ? (document.content.html as string)
                          : "";
                      setEditedContent(htmlContent);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContent}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "💾 Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Formatting toolbar (only in edit mode) */}
          {isEditingContent && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => formatText("bold")}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Bold"
                >
                  <strong>B</strong>
                </button>
                <button
                  onClick={() => formatText("italic")}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Italic"
                >
                  <em>I</em>
                </button>
                <button
                  onClick={() => formatText("underline")}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Underline"
                >
                  <u>U</u>
                </button>
                <div className="border-l border-gray-300 h-6 mx-2"></div>
                <button
                  onClick={() => formatText("justifyLeft")}
                  className="p-2 hover:bg-gray-200 rounded text-sm"
                  title="Align Left"
                >
                  ⬅
                </button>
                <button
                  onClick={() => formatText("justifyCenter")}
                  className="p-2 hover:bg-gray-200 rounded text-sm"
                  title="Align Center"
                >
                  ↔
                </button>
                <button
                  onClick={() => formatText("justifyRight")}
                  className="p-2 hover:bg-gray-200 rounded text-sm"
                  title="Align Right"
                >
                  ➡
                </button>
              </div>
            </div>
          )}

          {/* A4 Document Preview */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <div
              className="bg-white shadow-lg mx-auto p-12"
              style={{
                width: "210mm",
                minHeight: "297mm",
                fontSize: "12pt",
                lineHeight: "1.5",
                fontFamily: "Times New Roman, serif",
              }}
            >
              {isEditingContent ? (
                <div
                  contentEditable
                  onInput={updateEditedContent}
                  className="focus:outline-none"
                  dangerouslySetInnerHTML={{ __html: editedContent }}
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      document.content?.html ||
                      JSON.stringify(document.content),
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Signature Requests (if any) */}
        {document.signature_requests &&
          document.signature_requests.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Signature Requests
              </h3>
              <div className="space-y-3">
                {document.signature_requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.signer_name ||
                          request.signer_email ||
                          "Unknown Signer"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Order: {request.signing_order}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          request.status === "signed"
                            ? "bg-green-100 text-green-800"
                            : request.status === "viewed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {request.status}
                      </span>
                      {request.signed_at && (
                        <span className="text-xs text-gray-500">
                          Signed:{" "}
                          {new Date(request.signed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Document Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Document Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                Document Number:
              </span>
              <span className="ml-2 text-gray-900">
                {document.document_number}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className="ml-2">{getStatusBadge(document.status)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-gray-900">
                {new Date(document.created_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-900">
                {new Date(document.updated_at).toLocaleString()}
              </span>
            </div>
            {document.template && (
              <div>
                <span className="font-medium text-gray-700">Template:</span>
                <span className="ml-2 text-gray-900">
                  {document.template.name}
                </span>
              </div>
            )}
            {document.completed_at && (
              <div>
                <span className="font-medium text-gray-700">Completed:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(document.completed_at).toLocaleString()}
                </span>
              </div>
            )}
            {/* Links to related entities */}
            {document.transaction_id && (
              <div className="col-span-2">
                <span className="font-medium text-gray-700">Transaction:</span>
                <button
                  onClick={() =>
                    router.push(`/transactions/${document.transaction_id}`)
                  }
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  View Transaction →
                </button>
              </div>
            )}
            {document.exchange_id && (
              <div className="col-span-2">
                <span className="font-medium text-gray-700">Exchange:</span>
                <button
                  onClick={() =>
                    router.push(`/exchanges/${document.exchange_id}`)
                  }
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  View Exchange →
                </button>
              </div>
            )}
            {document.property_id && (
              <div className="col-span-2">
                <span className="font-medium text-gray-700">Property:</span>
                <button
                  onClick={() =>
                    router.push(`/properties/${document.property_id}`)
                  }
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  View Property →
                </button>
              </div>
            )}
            {document.eat_parked_file_id && (
              <div className="col-span-2">
                <span className="font-medium text-gray-700">EAT:</span>
                <button
                  onClick={() =>
                    router.push(`/eat/${document.eat_parked_file_id}`)
                  }
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  View EAT →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Folder Select Modal */}
        {showFolderSelectModal && (
          <FolderSelectModal
            entityType={
              document.transaction_id
                ? "transaction"
                : document.exchange_id
                ? "exchange"
                : document.property_id
                ? "property"
                : document.eat_parked_file_id
                ? "eat"
                : "transaction"
            }
            entityId={
              document.transaction_id?.toString() ||
              document.exchange_id?.toString() ||
              document.property_id?.toString() ||
              document.eat_parked_file_id?.toString() ||
              ""
            }
            documentName={document.document_name}
            documentContent={
              typeof document.content === "object" && "html" in document.content
                ? (document.content.html as string)
                : ""
            }
            onClose={() => setShowFolderSelectModal(false)}
            onSuccess={() => {
              alert("Document saved to repository!");
              setShowFolderSelectModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
