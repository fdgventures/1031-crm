"use client";

import React, { useState, useEffect } from "react";
import {
  getAdminSignatures,
  getAdminSignatureByUserId,
  createAdminSignature,
  updateAdminSignature,
  deleteAdminSignature,
} from "@/lib/document-templates";
import type {
  AdminSignature,
  SignatureType,
} from "@/types/document.types";
import { SIGNATURE_FONTS } from "@/types/document.types";

interface AdminSignatureManagerProps {
  qiCompanyId: string;
  adminUsers?: Array<{ id: string; email: string; first_name?: string; last_name?: string }>;
}

export default function AdminSignatureManager({
  qiCompanyId,
  adminUsers = [],
}: AdminSignatureManagerProps) {
  const [signatures, setSignatures] = useState<AdminSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSignature, setEditingSignature] = useState<AdminSignature | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [signatureType, setSignatureType] = useState<SignatureType>("property");
  const [signatureText, setSignatureText] = useState("");
  const [signatureFont, setSignatureFont] = useState("Brush Script MT");
  const [printedName, setPrintedName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [byName, setByName] = useState("");
  const [itsTitle, setItsTitle] = useState("");

  useEffect(() => {
    loadSignatures();
  }, [qiCompanyId]);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const data = await getAdminSignatures(qiCompanyId);
      setSignatures(data);
    } catch (error) {
      console.error("Error loading admin signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedAdminId("");
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

  const handleEdit = (signature: AdminSignature) => {
    setEditingSignature(signature);
    setSelectedAdminId(signature.admin_user_id);
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
    if (!selectedAdminId || !signatureText) {
      alert("Пожалуйста, заполните обязательные поля");
      return;
    }

    try {
      const signatureData: Partial<AdminSignature> = {
        admin_user_id: selectedAdminId,
        qi_company_id: qiCompanyId,
        signature_type: signatureType,
        signature_text: signatureText,
        signature_font: signatureFont,
        printed_name: signatureType === "property" ? printedName : undefined,
        entity_name: signatureType === "entity" ? entityName : undefined,
        by_name: signatureType === "entity" ? byName : undefined,
        its_title: signatureType === "entity" ? itsTitle : undefined,
      };

      if (editingSignature) {
        await updateAdminSignature(editingSignature.id, signatureData);
      } else {
        await createAdminSignature(signatureData);
      }

      await loadSignatures();
      resetForm();
    } catch (error) {
      console.error("Error saving admin signature:", error);
      alert("Ошибка при сохранении подписи");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту подпись?")) return;

    try {
      await deleteAdminSignature(id);
      await loadSignatures();
    } catch (error) {
      console.error("Error deleting admin signature:", error);
      alert("Ошибка при удалении подписи");
    }
  };

  const getAdminName = (userId: string) => {
    const admin = adminUsers.find((u) => u.id === userId);
    if (!admin) return userId;
    
    if (admin.first_name && admin.last_name) {
      return `${admin.first_name} ${admin.last_name}`;
    }
    return admin.email;
  };

  const renderSignaturePreview = () => {
    if (!signatureText) return null;

    return (
      <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-3">
          Предпросмотр подписи:
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
            Управление подписями администраторов
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Создайте и управляйте цифровыми подписями для администраторов QI
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить подпись
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingSignature ? "Редактировать подпись админа" : "Создать подпись для админа"}
          </h4>

          <div className="space-y-4">
            {/* Admin User */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Администратор *
              </label>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!editingSignature}
              >
                <option value="">Выберите администратора</option>
                {adminUsers.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {getAdminName(admin.id)} ({admin.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Signature Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип подписи *
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
                Текст подписи *
              </label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите подпись"
              />
            </div>

            {/* Signature Font */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Шрифт подписи
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
                  placeholder="Полное имя"
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
                    placeholder="Название компании QI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BY (имя подписанта)
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
                    ITS (должность)
                  </label>
                  <input
                    type="text"
                    value={itsTitle}
                    onChange={(e) => setItsTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Qualified Intermediary, Manager, etc."
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
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Сохранить подпись
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signatures List */}
      {!isCreating && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Загрузка...</div>
          ) : signatures.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Нет подписей для администраторов. Создайте первую подпись.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {signatures.map((signature) => (
                <div key={signature.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getAdminName(signature.admin_user_id)}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Тип: {signature.signature_type} | ID: {signature.signature_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(signature)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(signature.id)}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Удалить
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

