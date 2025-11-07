"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from "@/lib/document-templates";
import type { DocumentTemplate, TemplateType } from "@/types/document.types";
import { getDynamicFieldsForType } from "@/types/document.types";
import DocumentTemplateEditor from "@/components/DocumentTemplateEditor";

function DocumentBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedObjectType, setSelectedObjectType] = useState<TemplateType | null>(
    (searchParams.get("type") as TemplateType) || null
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTemplates();
    }
  }, [selectedObjectType, isAuthenticated]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Auth check result:", { hasUser: !!user, userId: user?.id });
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getDocumentTemplates(selectedObjectType || undefined);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (!selectedObjectType) {
      alert("Please select an object type");
      return;
    }
    setIsCreating(true);
    setSelectedTemplate(null);
  };

  const handleSaveTemplate = async (template: Partial<DocumentTemplate>) => {
    try {
      console.log("Saving template:", template);
      if (selectedTemplate) {
        await updateDocumentTemplate(selectedTemplate.id, template);
      } else {
        const newTemplate = await createDocumentTemplate({
          ...template,
          template_type: selectedObjectType!,
        });
        console.log("Template created successfully:", newTemplate);
      }
      await loadTemplates();
      setIsCreating(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error saving template:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error saving template: ${errorMessage}`);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await deleteDocumentTemplate(id);
      await loadTemplates();
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Error deleting template");
    }
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setSelectedTemplate(null);
  };

  // Auth checking
  if (authChecking) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-pulse">
            <div className="text-lg text-gray-600">Checking authentication...</div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access Document Builder.
          </p>
          <button
            onClick={() => router.push("/admin/signin")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isCreating || selectedTemplate) {
    return (
      <DocumentTemplateEditor
        template={selectedTemplate}
        templateType={selectedObjectType!}
        onSave={handleSaveTemplate}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Builder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage document templates with dynamic fields
        </p>
      </div>

      {/* Object Type Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select Object Type
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: "transaction" as TemplateType, label: "Transaction", icon: "📄" },
            { type: "exchange" as TemplateType, label: "Exchange", icon: "🔄" },
            { type: "property" as TemplateType, label: "Property", icon: "🏠" },
            { type: "eat" as TemplateType, label: "EAT", icon: "📋" },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => setSelectedObjectType(item.type)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedObjectType === item.type
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-gray-200 hover:border-blue-300 text-gray-700"
              }`}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-medium">{item.label}</div>
            </button>
          ))}
        </div>

        {selectedObjectType && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Available Dynamic Fields:
            </h3>
            <div className="flex flex-wrap gap-2">
              {getDynamicFieldsForType(selectedObjectType).map((field) => (
                <span
                  key={field.placeholder}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700"
                >
                  {field.placeholder}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Templates List */}
      {selectedObjectType && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Templates for {selectedObjectType}
            </h2>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Template
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No templates for this object type
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {template.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Created:{" "}
                          {new Date(template.created_at).toLocaleDateString()}
                        </span>
                        {template.dynamic_fields && template.dynamic_fields.length > 0 && (
                          <span>
                            Fields: {template.dynamic_fields.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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

export default function DocumentBuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DocumentBuilderContent />
    </Suspense>
  );
}

