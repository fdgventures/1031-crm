"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { DocumentRepository } from "@/components/document-repository";
import { TaskManager } from "@/components/TaskManager";
import { LogViewer } from "@/components/LogViewer";
import { MessagingSystem } from "@/components/MessagingSystem";
import AccountingTable from "@/components/AccountingTable/AccountingTable";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getEATParkedFile,
  updateEATParkedFile,
  updateSecretaryOfState,
  updateLenderInformation,
  type EATParkedFileWithRelations,
} from "@/lib/eat-parked-files";
import {
  getEATInvoices,
  deleteEATInvoice,
  type EATInvoiceWithItems,
} from "@/lib/eat-invoices";
import { getUSStates } from "@/lib/eat-llc";
import type { USState } from "@/types/eat.types";
import { EATInvoiceModal } from "@/components/EATInvoiceModal";
import { EATPropertyIdentification } from "@/components/EATPropertyIdentification";

export default function EATParkedFilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [eatFile, setEatFile] = useState<EATParkedFileWithRelations | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);
  const [states, setStates] = useState<USState[]>([]);

  // Editing states
  const [isEditingMain, setIsEditingMain] = useState(false);
  const [isEditingSOS, setIsEditingSOS] = useState(false);
  const [isEditingLender, setIsEditingLender] = useState(false);
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);

  // Main edit values
  const [mainEditValues, setMainEditValues] = useState({
    eat_name: "",
    status: "pending" as "pending" | "active" | "completed" | "cancelled",
    state: "",
    day_45_date: "",
    day_180_date: "",
    close_date: "",
  });

  // SOS edit values
  const [sosEditValues, setSosEditValues] = useState({
    transfer_type: "",
    eat_transfer_to_exchangor_transaction_date: "",
    eat_sos_status: "",
    eat_client_touchback_date: "",
    eat_sos_dissolve_transfer_date: "",
  });

  // Lender edit values
  const [lenderEditValues, setLenderEditValues] = useState({
    loan_to_value_ratio: "",
    lender_business_card_id: null as number | null,
    lender_note_amount: "",
    lender_note_date: "",
  });

  // Timeline edit values
  const [timelineEditValues, setTimelineEditValues] = useState({
    improvement_start_date: "",
    improvement_estimated_completion_date: "",
    improvement_actual_completion_date: "",
  });

  // Business cards for lender selection
  const [businessCards, setBusinessCards] = useState<
    Array<{ id: number; business_name: string; email: string }>
  >([]);

  // Invoices
  const [invoices, setInvoices] = useState<EATInvoiceWithItems[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] =
    useState<EATInvoiceWithItems | null>(null);

  useEffect(() => {
    document.title = `EAT Parked File | 1031 Exchange CRM`;
  }, []);

  const loadEATFile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEATParkedFile(parseInt(id));
      if (data) {
        setEatFile(data);
        document.title = `${data.eat_number} | EAT | 1031 Exchange CRM`;
      }
    } catch (error) {
      console.error("Error loading EAT Parked File:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadStates = useCallback(async () => {
    const data = await getUSStates();
    setStates(data);
  }, []);

  const loadBusinessCards = useCallback(async () => {
    const { data } = await supabase
      .from("business_cards")
      .select("id, business_name, email")
      .order("business_name");

    setBusinessCards(data || []);
  }, [supabase]);

  const loadInvoices = useCallback(async () => {
    const data = await getEATInvoices(parseInt(id));
    setInvoices(data);
  }, [id]);

  useEffect(() => {
    loadEATFile();
    loadStates();
    loadBusinessCards();
    loadInvoices();
  }, [loadEATFile, loadStates, loadBusinessCards, loadInvoices]);

  const startEditingMain = () => {
    if (!eatFile) return;
    setMainEditValues({
      eat_name: eatFile.eat_name,
      status: eatFile.status,
      state: eatFile.state,
      day_45_date: eatFile.day_45_date || "",
      day_180_date: eatFile.day_180_date || "",
      close_date: eatFile.close_date || "",
    });
    setIsEditingMain(true);
  };

  const saveMainChanges = async () => {
    if (!eatFile) return;

    const success = await updateEATParkedFile(eatFile.id, {
      eat_name: mainEditValues.eat_name,
      status: mainEditValues.status,
      state: mainEditValues.state,
      day_45_date: mainEditValues.day_45_date || null,
      day_180_date: mainEditValues.day_180_date || null,
      close_date: mainEditValues.close_date || null,
    });

    if (success) {
      await loadEATFile();
      setIsEditingMain(false);
    }
  };

  const startEditingSOS = () => {
    if (!eatFile) return;
    const sos = eatFile.secretary_of_state;
    setSosEditValues({
      transfer_type: sos?.transfer_type || "",
      eat_transfer_to_exchangor_transaction_date:
        sos?.eat_transfer_to_exchangor_transaction_date || "",
      eat_sos_status: sos?.eat_sos_status || "",
      eat_client_touchback_date: sos?.eat_client_touchback_date || "",
      eat_sos_dissolve_transfer_date: sos?.eat_sos_dissolve_transfer_date || "",
    });
    setIsEditingSOS(true);
  };

  const saveSOSChanges = async () => {
    if (!eatFile) return;

    const success = await updateSecretaryOfState(eatFile.id, {
      transfer_type: sosEditValues.transfer_type || null,
      eat_transfer_to_exchangor_transaction_date:
        sosEditValues.eat_transfer_to_exchangor_transaction_date || null,
      eat_sos_status: sosEditValues.eat_sos_status || null,
      eat_client_touchback_date:
        sosEditValues.eat_client_touchback_date || null,
      eat_sos_dissolve_transfer_date:
        sosEditValues.eat_sos_dissolve_transfer_date || null,
    });

    if (success) {
      await loadEATFile();
      setIsEditingSOS(false);
    }
  };

  const startEditingLender = () => {
    if (!eatFile) return;
    const lender = eatFile.lender;
    setLenderEditValues({
      loan_to_value_ratio: lender?.loan_to_value_ratio || "",
      lender_business_card_id: lender?.lender_business_card_id || null,
      lender_note_amount: lender?.lender_note_amount?.toString() || "",
      lender_note_date: lender?.lender_note_date || "",
    });
    setIsEditingLender(true);
  };

  const saveLenderChanges = async () => {
    if (!eatFile) return;

    const success = await updateLenderInformation(eatFile.id, {
      loan_to_value_ratio: lenderEditValues.loan_to_value_ratio || null,
      lender_business_card_id: lenderEditValues.lender_business_card_id,
      lender_note_amount: lenderEditValues.lender_note_amount
        ? parseFloat(lenderEditValues.lender_note_amount)
        : null,
      lender_note_date: lenderEditValues.lender_note_date || null,
    });

    if (success) {
      await loadEATFile();
      setIsEditingLender(false);
    }
  };

  const startEditingTimeline = () => {
    if (!eatFile) return;
    setTimelineEditValues({
      improvement_start_date: eatFile.improvement_start_date || "",
      improvement_estimated_completion_date:
        eatFile.improvement_estimated_completion_date || "",
      improvement_actual_completion_date:
        eatFile.improvement_actual_completion_date || "",
    });
    setIsEditingTimeline(true);
  };

  const saveTimelineChanges = async () => {
    if (!eatFile) return;

    const success = await updateEATParkedFile(eatFile.id, {
      improvement_start_date: timelineEditValues.improvement_start_date || null,
      improvement_estimated_completion_date:
        timelineEditValues.improvement_estimated_completion_date || null,
      improvement_actual_completion_date:
        timelineEditValues.improvement_actual_completion_date || null,
    });

    if (success) {
      await loadEATFile();
      setIsEditingTimeline(false);
    }
  };

  const handleOpenInvoiceModal = () => {
    setEditingInvoice(null);
    setShowInvoiceModal(true);
  };

  const handleEditInvoice = (invoice: EATInvoiceWithItems) => {
    setEditingInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const success = await deleteEATInvoice(invoiceId);
    if (success) {
      await loadInvoices();
      await loadEATFile(); // Reload to update totals
    }
  };

  const handleInvoiceSuccess = async () => {
    setShowInvoiceModal(false);
    setEditingInvoice(null);
    await loadInvoices();
    await loadEATFile(); // Reload to update totals
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading EAT Parked File...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!eatFile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-red-600">EAT Parked File not found</p>
            <Button
              onClick={() => router.push("/eat")}
              variant="outline"
              className="mt-4"
            >
              ← Back to EAT List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <Button onClick={() => router.push("/eat")} variant="outline">
            ← Back to EAT List
          </Button>
        </div>

        {/* Main Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {eatFile.eat_number}
              </h1>
              <p className="text-sm text-gray-600 mt-1">{eatFile.eat_name}</p>
            </div>
            {!isEditingMain && (
              <Button onClick={startEditingMain} variant="outline">
                ✏️ Edit
              </Button>
            )}
            {isEditingMain && (
              <div className="flex gap-2">
                <Button onClick={saveMainChanges} variant="primary">
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditingMain(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* EAT Number */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  EAT Number
                </h3>
                <p className="text-lg text-gray-900">{eatFile.eat_number}</p>
              </div>

              {/* EAT Name */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  EAT Name
                </h3>
                {isEditingMain ? (
                  <input
                    type="text"
                    value={mainEditValues.eat_name}
                    onChange={(e) =>
                      setMainEditValues({
                        ...mainEditValues,
                        eat_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">{eatFile.eat_name}</p>
                )}
              </div>

              {/* Total Acquired Property Value */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Total Acquired Property Value
                </h3>
                <p className="text-lg text-gray-900">
                  $
                  {eatFile.total_acquired_property_value?.toLocaleString() ||
                    "0"}
                </p>
              </div>

              {/* Total Invoice Value */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Total Invoice Value
                </h3>
                <p className="text-lg text-gray-900">
                  ${eatFile.total_invoice_value?.toLocaleString() || "0"}
                </p>
              </div>

              {/* Total Parked Property Value */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Total Parked Property Value
                </h3>
                <p className="text-lg text-gray-900">
                  $
                  {eatFile.total_parked_property_value?.toLocaleString() || "0"}
                </p>
              </div>

              {/* Total Sale Property Value */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Total Sale Property Value
                </h3>
                <p className="text-lg text-gray-900">
                  ${eatFile.total_sale_property_value?.toLocaleString() || "0"}
                </p>
              </div>

              {/* Value Remaining */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Value Remaining
                </h3>
                <p className="text-lg text-gray-900 font-semibold">
                  ${eatFile.value_remaining?.toLocaleString() || "0"}
                </p>
              </div>

              {/* 45 Day Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  45 Day Date
                </h3>
                {isEditingMain ? (
                  <input
                    type="date"
                    value={mainEditValues.day_45_date}
                    onChange={(e) =>
                      setMainEditValues({
                        ...mainEditValues,
                        day_45_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {eatFile.day_45_date
                      ? new Date(eatFile.day_45_date).toLocaleDateString()
                      : "—"}
                  </p>
                )}
              </div>

              {/* 180 Day Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  180 Day Date
                </h3>
                {isEditingMain ? (
                  <input
                    type="date"
                    value={mainEditValues.day_180_date}
                    onChange={(e) =>
                      setMainEditValues({
                        ...mainEditValues,
                        day_180_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {eatFile.day_180_date
                      ? new Date(eatFile.day_180_date).toLocaleDateString()
                      : "—"}
                  </p>
                )}
              </div>

              {/* EAT Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  EAT Status
                </h3>
                {isEditingMain ? (
                  <select
                    value={mainEditValues.status}
                    onChange={(e) =>
                      setMainEditValues({
                        ...mainEditValues,
                        status: e.target.value as
                          | "pending"
                          | "active"
                          | "completed"
                          | "cancelled",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(
                      eatFile.status
                    )}`}
                  >
                    {eatFile.status}
                  </span>
                )}
              </div>

              {/* State */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  State
                </h3>
                {isEditingMain ? (
                  <select
                    value={mainEditValues.state}
                    onChange={(e) =>
                      setMainEditValues({
                        ...mainEditValues,
                        state: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {states.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-lg text-gray-900">{eatFile.state}</p>
                )}
              </div>

              {/* Close Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Close Date
                </h3>
                {isEditingMain ? (
                  <input
                    type="date"
                    value={mainEditValues.close_date}
                    onChange={(e) =>
                      setMainEditValues({
                        ...mainEditValues,
                        close_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-lg text-gray-900">
                    {eatFile.close_date
                      ? new Date(eatFile.close_date).toLocaleDateString()
                      : "—"}
                  </p>
                )}
              </div>
            </div>

            {/* EAT LLC Info */}
            {eatFile.eat_llc && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  EAT LLC Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="text-gray-900 font-medium">
                      {eatFile.eat_llc.company_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State of Formation</p>
                    <p className="text-gray-900">
                      {eatFile.eat_llc.state_formation}
                    </p>
                  </div>
                  {eatFile.eat_llc.licensed_in && (
                    <div>
                      <p className="text-sm text-gray-500">Licensed In</p>
                      <p className="text-gray-900">
                        {eatFile.eat_llc.licensed_in}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exchangors */}
            {eatFile.exchangors && eatFile.exchangors.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Exchangors
                </h3>
                <div className="space-y-2">
                  {eatFile.exchangors.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <p className="font-medium text-gray-900">
                        {ex.tax_account.name}
                      </p>
                      {ex.tax_account.account_number && (
                        <p className="text-sm text-gray-600">
                          {ex.tax_account.account_number}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secretary of State / LLC Monitoring */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Secretary of State / LLC Monitoring
            </h2>
            {!isEditingSOS && (
              <Button onClick={startEditingSOS} variant="outline">
                ✏️ Edit
              </Button>
            )}
            {isEditingSOS && (
              <div className="flex gap-2">
                <Button onClick={saveSOSChanges} variant="primary">
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditingSOS(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="p-6">
            {eatFile.secretary_of_state ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transfer Type */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Transfer Type
                  </h3>
                  {isEditingSOS ? (
                    <input
                      type="text"
                      value={sosEditValues.transfer_type}
                      onChange={(e) =>
                        setSosEditValues({
                          ...sosEditValues,
                          transfer_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.secretary_of_state.transfer_type || "—"}
                    </p>
                  )}
                </div>

                {/* EAT Transfer to Exchangor Transaction Date */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    EAT Transfer to Exchangor Transaction Date
                  </h3>
                  {isEditingSOS ? (
                    <input
                      type="date"
                      value={
                        sosEditValues.eat_transfer_to_exchangor_transaction_date
                      }
                      onChange={(e) =>
                        setSosEditValues({
                          ...sosEditValues,
                          eat_transfer_to_exchangor_transaction_date:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.secretary_of_state
                        .eat_transfer_to_exchangor_transaction_date
                        ? new Date(
                            eatFile.secretary_of_state.eat_transfer_to_exchangor_transaction_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>

                {/* EAT SOS Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    EAT SOS Status
                  </h3>
                  {isEditingSOS ? (
                    <select
                      value={sosEditValues.eat_sos_status}
                      onChange={(e) =>
                        setSosEditValues({
                          ...sosEditValues,
                          eat_sos_status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Not selected</option>
                      <option value="EAT in OPUS name - Active">
                        EAT in OPUS name - Active
                      </option>
                      <option value="EAT Transferred to taxpayer">
                        EAT Transferred to taxpayer
                      </option>
                      <option value="EAT Disolved">EAT Disolved</option>
                    </select>
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.secretary_of_state.eat_sos_status || "—"}
                    </p>
                  )}
                </div>

                {/* EAT Client Touchback Date */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    EAT Client Touchback Date
                  </h3>
                  {isEditingSOS ? (
                    <input
                      type="date"
                      value={sosEditValues.eat_client_touchback_date}
                      onChange={(e) =>
                        setSosEditValues({
                          ...sosEditValues,
                          eat_client_touchback_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.secretary_of_state.eat_client_touchback_date
                        ? new Date(
                            eatFile.secretary_of_state.eat_client_touchback_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>

                {/* EAT SOS Dissolve Transfer Date */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    EAT SOS Dissolve Transfer Date
                  </h3>
                  {isEditingSOS ? (
                    <input
                      type="date"
                      value={sosEditValues.eat_sos_dissolve_transfer_date}
                      onChange={(e) =>
                        setSosEditValues({
                          ...sosEditValues,
                          eat_sos_dissolve_transfer_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.secretary_of_state.eat_sos_dissolve_transfer_date
                        ? new Date(
                            eatFile.secretary_of_state.eat_sos_dissolve_transfer_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data</p>
            )}
          </div>
        </div>

        {/* Transactions Block */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Transactions
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* EAT Acquisition */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  EAT Acquisition
                </h3>
                <p className="text-sm text-gray-500">
                  Acquisition transactions will be displayed here
                </p>
              </div>

              {/* Sale Transaction by Exchangor */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Sale Transaction by Exchangor
                </h3>
                <p className="text-sm text-gray-500">
                  Sale transactions will be displayed here
                </p>
              </div>

              {/* EAT to Exchangor */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  EAT to Exchangor
                </h3>
                <p className="text-sm text-gray-500">
                  Transfer transactions will be displayed here
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Identified Properties */}
        <EATPropertyIdentification
          eatParkedFileId={parseInt(id)}
          totalSalePropertyValue={eatFile.total_sale_property_value || 0}
        />

        {/* Statement of Account */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Statement of Account
            </h2>
          </div>
          <div className="p-6">
            <AccountingTable eatParkedFileId={parseInt(id)} />
          </div>
        </div>

        {/* Lender Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Lender Information
            </h2>
            {!isEditingLender && (
              <Button onClick={startEditingLender} variant="outline">
                ✏️ Edit
              </Button>
            )}
            {isEditingLender && (
              <div className="flex gap-2">
                <Button onClick={saveLenderChanges} variant="primary">
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditingLender(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="p-6">
            {eatFile.lender ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Loan to Value Ratio */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Loan to Value Ratio
                  </h3>
                  {isEditingLender ? (
                    <input
                      type="text"
                      value={lenderEditValues.loan_to_value_ratio}
                      onChange={(e) =>
                        setLenderEditValues({
                          ...lenderEditValues,
                          loan_to_value_ratio: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 70%"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.lender.loan_to_value_ratio || "—"}
                    </p>
                  )}
                </div>

                {/* Lender Name */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Lender Name
                  </h3>
                  {isEditingLender ? (
                    <select
                      value={lenderEditValues.lender_business_card_id || ""}
                      onChange={(e) =>
                        setLenderEditValues({
                          ...lenderEditValues,
                          lender_business_card_id: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Not selected</option>
                      {businessCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.business_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.lender.business_card?.business_name || "—"}
                    </p>
                  )}
                </div>

                {/* Lender Note Amount */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Lender Note Amount
                  </h3>
                  {isEditingLender ? (
                    <input
                      type="number"
                      value={lenderEditValues.lender_note_amount}
                      onChange={(e) =>
                        setLenderEditValues({
                          ...lenderEditValues,
                          lender_note_amount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                      step="0.01"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.lender.lender_note_amount
                        ? `$${eatFile.lender.lender_note_amount.toLocaleString()}`
                        : "—"}
                    </p>
                  )}
                </div>

                {/* Lender Note Date */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Lender Note Date
                  </h3>
                  {isEditingLender ? (
                    <input
                      type="date"
                      value={lenderEditValues.lender_note_date}
                      onChange={(e) =>
                        setLenderEditValues({
                          ...lenderEditValues,
                          lender_note_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">
                      {eatFile.lender.lender_note_date
                        ? new Date(
                            eatFile.lender.lender_note_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>

                {/* Lender Document */}
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Lender Document
                  </h3>
                  <p className="text-sm text-gray-500">
                    File uploader will be implemented
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data</p>
            )}
          </div>
        </div>

        {/* Construction Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Construction Information
            </h2>
          </div>
          <div className="p-6">
            {/* Improvement Timeline - Editable Block */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Improvement Timeline
                </h3>
                {!isEditingTimeline && (
                  <Button
                    onClick={startEditingTimeline}
                    variant="outline"
                    size="small"
                  >
                    ✏️ Edit
                  </Button>
                )}
                {isEditingTimeline && (
                  <div className="flex gap-2">
                    <Button
                      onClick={saveTimelineChanges}
                      variant="primary"
                      size="small"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsEditingTimeline(false)}
                      variant="outline"
                      size="small"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Start Date */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Start Date
                  </p>
                  {isEditingTimeline ? (
                    <input
                      type="date"
                      value={timelineEditValues.improvement_start_date}
                      onChange={(e) =>
                        setTimelineEditValues({
                          ...timelineEditValues,
                          improvement_start_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {eatFile.improvement_start_date
                        ? new Date(
                            eatFile.improvement_start_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>

                {/* Est. Completion Date */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Est. Completion Date
                  </p>
                  {isEditingTimeline ? (
                    <input
                      type="date"
                      value={
                        timelineEditValues.improvement_estimated_completion_date
                      }
                      onChange={(e) =>
                        setTimelineEditValues({
                          ...timelineEditValues,
                          improvement_estimated_completion_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {eatFile.improvement_estimated_completion_date
                        ? new Date(
                            eatFile.improvement_estimated_completion_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>

                {/* Actual Completion Date */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Actual Completion Date
                  </p>
                  {isEditingTimeline ? (
                    <input
                      type="date"
                      value={
                        timelineEditValues.improvement_actual_completion_date
                      }
                      onChange={(e) =>
                        setTimelineEditValues({
                          ...timelineEditValues,
                          improvement_actual_completion_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {eatFile.improvement_actual_completion_date
                        ? new Date(
                            eatFile.improvement_actual_completion_date
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleOpenInvoiceModal}
                >
                  + Add Invoice
                </Button>
              </div>

              {invoices.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No invoices created yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Invoice Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Paid To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Items
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(
                              invoice.invoice_date
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.paid_to}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ${invoice.total_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                invoice.invoice_type ===
                                "Invoice paid through exchange"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {invoice.invoice_type ===
                              "Invoice paid through exchange"
                                ? "Through Exchange"
                                : "Outside Exchange"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="max-w-xs">
                              {invoice.items.map((item, idx) => (
                                <div key={item.id} className="text-xs mb-1">
                                  {idx + 1}. {item.description} - $
                                  {item.amount.toLocaleString()}
                                  {item.property && (
                                    <span className="text-gray-500">
                                      {" "}
                                      ({item.property.address})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditInvoice(invoice)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documents */}
        <DocumentRepository entityType="eat" entityId={id} />

        {/* Messaging */}
        <MessagingSystem
          entityType="eat"
          entityId={parseInt(id)}
          entityName={eatFile.eat_number}
        />

        {/* Tasks */}
        <TaskManager
          entityType="eat"
          entityId={parseInt(id)}
          entityName={eatFile.eat_number}
          onLogCreate={() => setLogRefreshTrigger(Date.now())}
        />

        {/* Activity Log */}
        <LogViewer
          entityType="eat"
          entityId={parseInt(id)}
          entityName={eatFile.eat_number}
          refreshTrigger={logRefreshTrigger}
        />
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <EATInvoiceModal
          eatParkedFileId={parseInt(id)}
          invoice={editingInvoice}
          onClose={() => {
            setShowInvoiceModal(false);
            setEditingInvoice(null);
          }}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  );
}
