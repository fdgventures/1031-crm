"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getDocuments,
  getDocumentTemplates,
  createDocument,
} from "@/lib/document-templates";
import type { Document, DocumentTemplate } from "@/types/document.types";
import FillTemplateModal from "./FillTemplateModal";

interface TransactionData {
  transaction_number: string;
  contract_purchase_price: number;
  contract_date: string;
  sale_type: string;
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

interface TransactionDocumentsProps {
  transactionId: number;
  transactionData: TransactionData;
}

export default function TransactionDocuments({
  transactionId,
  transactionData,
}: TransactionDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showFillModal, setShowFillModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [transactionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, templatesData] = await Promise.all([
        getDocuments({ transactionId }),
        getDocumentTemplates("transaction"),
      ]);
      setDocuments(docsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowCreateModal(false);
    setShowFillModal(true);
  };

  const handleFillTemplateSubmit = async (filledData: Record<string, string>) => {
    if (!selectedTemplate) return;

    try {
      // Get the HTML content from template
      let htmlContent = typeof selectedTemplate.content === 'object' && 'html' in selectedTemplate.content 
        ? (selectedTemplate.content.html as string || "") 
        : "";
      
      console.log("Original content:", htmlContent);
      console.log("Fill data:", filledData);
      
      // Replace dynamic fields in HTML content with filled data
      // We need to handle HTML entities (&lt; and &gt;) because the editor escapes < and >
      Object.entries(filledData).forEach(([placeholder, value]) => {
        // Create both plain and HTML-escaped versions of placeholder
        const plainPlaceholder = placeholder; // e.g., "<<transaction number>>"
        const escapedPlaceholder = placeholder
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;'); // e.g., "&lt;&lt;transaction number&gt;&gt;"
        
        // Escape special regex characters
        const escapedForRegex = escapedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const plainForRegex = plainPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Pattern 1: Replace HTML-escaped placeholders in spans
        // <span ...>&lt;&lt;placeholder&gt;&gt;</span>
        const spanPattern = new RegExp(
          `<span[^>]*class="[^"]*dynamic-field[^"]*"[^>]*>${escapedForRegex}</span>`,
          'gi'
        );
        const replaced1 = htmlContent.replace(spanPattern, value);
        if (replaced1 !== htmlContent) {
          console.log(`Replaced span-wrapped ${placeholder} with ${value}`);
          htmlContent = replaced1;
        }
        
        // Pattern 2: Replace HTML-escaped placeholders (plain text)
        const escapedPattern = new RegExp(escapedForRegex, 'g');
        const replaced2 = htmlContent.replace(escapedPattern, value);
        if (replaced2 !== htmlContent) {
          console.log(`Replaced escaped ${placeholder} with ${value}`);
          htmlContent = replaced2;
        }
        
        // Pattern 3: Replace plain text occurrences (just in case)
        const plainPattern = new RegExp(plainForRegex, 'g');
        const replaced3 = htmlContent.replace(plainPattern, value);
        if (replaced3 !== htmlContent) {
          console.log(`Replaced plain ${placeholder} with ${value}`);
          htmlContent = replaced3;
        }
      });

      console.log("Final content:", htmlContent);

      await createDocument({
        template_id: selectedTemplate.id,
        document_name: `${selectedTemplate.name} - ${transactionData.transaction_number}`,
        transaction_id: transactionId,
        content: { html: htmlContent },
        status: "draft",
      });

      setShowFillModal(false);
      setSelectedTemplate(null);
      await loadData();
      
      alert("Document created successfully!");
    } catch (error) {
      console.error("Error creating document:", error);
      alert("Error creating document");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      pending_signatures: { label: "Pending Signatures", className: "bg-yellow-100 text-yellow-800" },
      partially_signed: { label: "Partially Signed", className: "bg-blue-100 text-blue-800" },
      fully_signed: { label: "Fully Signed", className: "bg-green-100 text-green-800" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Document Templates
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Create Template
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Documents List */}
          {documents.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Created Documents
              </h4>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {doc.document_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {doc.document_number} •{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(doc.status)}
                      <button
                        onClick={() => router.push(`/documents/${doc.id}`)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {documents.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>No documents created for this transaction</p>
              <p className="text-sm mt-1">
                Create a document from a template or go to Document Builder
              </p>
            </div>
          )}
        </>
      )}

      {/* Create from Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Document from Template
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    No templates available for transactions
                  </p>
                  <button
                    onClick={() => router.push("/document-builder?type=transaction")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <h4 className="font-medium text-gray-900">
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {template.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        {template.dynamic_fields && template.dynamic_fields.length > 0 && (
                          <span>
                            {template.dynamic_fields.length} dynamic fields
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          Created {new Date(template.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => router.push("/document-builder?type=transaction")}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                → Go to Document Builder
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill Template Modal */}
      {showFillModal && selectedTemplate && (
        <FillTemplateModal
          template={selectedTemplate}
          transactionData={transactionData}
          onSubmit={handleFillTemplateSubmit}
          onClose={() => {
            setShowFillModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}


