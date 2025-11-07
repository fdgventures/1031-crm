"use client";

import React, { useState, useRef } from "react";
import type { DocumentTemplate, TemplateType } from "@/types/document.types";
import { getDynamicFieldsForType } from "@/types/document.types";
import SignatureFieldsPlacer from "./SignatureFieldsPlacer";
import AuthCheck from "./AuthCheck";

interface DocumentTemplateEditorProps {
  template: DocumentTemplate | null;
  templateType: TemplateType;
  onSave: (template: Partial<DocumentTemplate>) => Promise<void>;
  onCancel: () => void;
}

type TextAlign = "left" | "center" | "right" | "justify";

export default function DocumentTemplateEditor({
  template,
  templateType,
  onSave,
  onCancel,
}: DocumentTemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [content, setContent] = useState(() => {
    if (!template?.content) return "";
    return typeof template.content === "object" && "html" in template.content
      ? (template.content.html as string) || ""
      : "";
  });
  const [showSignatureFields, setShowSignatureFields] = useState(false);
  const [saving, setSaving] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const dynamicFields = getDynamicFieldsForType(templateType);

  // Text formatting functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const setTextAlign = (align: TextAlign) => {
    const alignCommands: Record<TextAlign, string> = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    formatText(alignCommands[align]);
  };

  const insertDynamicField = (placeholder: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.className = "dynamic-field";
      span.contentEditable = "false";
      span.textContent = placeholder;
      span.style.backgroundColor = "#dbeafe";
      span.style.color = "#1e40af";
      span.style.padding = "2px 8px";
      span.style.borderRadius = "4px";
      span.style.margin = "0 2px";
      span.style.display = "inline-block";
      span.style.cursor = "default";

      range.deleteContents();
      range.insertNode(span);

      // Move cursor after the inserted field
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);

      updateContent();
    }
    editorRef.current?.focus();
  };

  const updateContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter template name");
      return;
    }

    if (!content.trim()) {
      alert("Please add template content");
      return;
    }

    setSaving(true);
    try {
      // Extract dynamic fields from content
      const dynamicFieldMatches = content.match(/<<[^>]+>>/g) || [];
      const uniqueDynamicFields: string[] = Array.from(
        new Set(dynamicFieldMatches)
      );

      await onSave({
        name,
        description,
        content: { html: content },
        dynamic_fields: uniqueDynamicFields,
        template_type: templateType,
        is_active: true,
      });
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Auth Check - For debugging */}
      <AuthCheck />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {template ? "Edit Template" : "Create New Template"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Type: {templateType}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3">
          {/* Template Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Purchase Agreement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief template description"
                />
              </div>
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="bg-white rounded-lg shadow mb-2">
            <div className="p-3 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                {/* Text Style */}
                <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                  <button
                    onClick={() => formatText("bold")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Жирный"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => formatText("italic")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Курсив"
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => formatText("underline")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Подчеркнутый"
                  >
                    <u>U</u>
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                  <button
                    onClick={() => setTextAlign("left")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="По левому краю"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="15" y2="12" />
                      <line x1="3" y1="18" x2="18" y2="18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTextAlign("center")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="По центру"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="6" y1="12" x2="18" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTextAlign("right")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="По правому краю"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="9" y1="12" x2="21" y2="12" />
                      <line x1="6" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTextAlign("justify")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="По ширине"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                  <button
                    onClick={() => formatText("insertUnorderedList")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Маркированный список"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <circle cx="4" cy="6" r="1" fill="currentColor" />
                      <circle cx="4" cy="12" r="1" fill="currentColor" />
                      <circle cx="4" cy="18" r="1" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    onClick={() => formatText("insertOrderedList")}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Нумерованный список"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="10" y1="6" x2="21" y2="6" />
                      <line x1="10" y1="12" x2="21" y2="12" />
                      <line x1="10" y1="18" x2="21" y2="18" />
                      <text x="3" y="9" fontSize="10" fill="currentColor">
                        1
                      </text>
                      <text x="3" y="15" fontSize="10" fill="currentColor">
                        2
                      </text>
                      <text x="3" y="21" fontSize="10" fill="currentColor">
                        3
                      </text>
                    </svg>
                  </button>
                </div>

                {/* Signature Fields */}
                <button
                  onClick={() => setShowSignatureFields(!showSignatureFields)}
                  className={`px-3 py-2 rounded transition-colors ${
                    showSignatureFields
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                  title="Signature Fields"
                >
                  ✍️ Signatures
                </button>
              </div>
            </div>
          </div>

          {/* Editor Canvas (A4 Format) */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <div
              className="bg-white shadow-lg mx-auto"
              style={{ width: "210mm", minHeight: "297mm" }}
            >
              <div
                ref={editorRef}
                contentEditable
                onInput={updateContent}
                onBlur={updateContent}
                className="p-12 min-h-[297mm] focus:outline-none"
                style={{
                  fontSize: "12pt",
                  lineHeight: "1.5",
                  fontFamily: "Times New Roman, serif",
                }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>

          {/* Signature Fields Placer */}
          {showSignatureFields && template && (
            <div className="mt-6">
              <SignatureFieldsPlacer templateId={template.id} />
            </div>
          )}
        </div>

        {/* Sidebar - Dynamic Fields */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-3">Dynamic Fields</h3>
            <p className="text-xs text-gray-500 mb-4">
              Click a field to insert it into the document
            </p>
            <div className="space-y-2">
              {dynamicFields.map((field) => (
                <button
                  key={field.placeholder}
                  onClick={() => insertDynamicField(field.placeholder)}
                  className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                >
                  <div className="font-medium">{field.label}</div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    {field.placeholder}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                Document Format
              </h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• Size: A4 (210mm × 297mm)</div>
                <div>• Margins: 12mm all sides</div>
                <div>• Font: Times New Roman, 12pt</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
