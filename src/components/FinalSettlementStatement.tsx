"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import {
  SettlementSeller,
  SettlementBuyer,
  WireInstruction,
} from "@/types/settlement";
import { WireInstructionModal } from "./WireInstructionModal";

interface FinalSettlementStatementProps {
  transactionId: string;
  sellers: any[];
  buyers: any[];
}

export function FinalSettlementStatement({
  transactionId,
  sellers,
  buyers,
}: FinalSettlementStatementProps) {
  const supabaseRef = useRef(getSupabaseClient());
  const supabase = supabaseRef.current;
  const [finalFile, setFinalFile] = useState<string | null>(null);
  const [finalFileUrl, setFinalFileUrl] = useState<string | null>(null);
  const [settlementSellers, setSettlementSellers] = useState<
    SettlementSeller[]
  >([]);
  const [settlementBuyers, setSettlementBuyers] = useState<SettlementBuyer[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedWireInstructionEntity, setSelectedWireInstructionEntity] =
    useState<{
      type: "seller" | "buyer";
      id: string;
      taxUserId: number | null;
    } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load transaction final file
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("final_settlement_statement_file")
        .eq("id", transactionId)
        .single();

      if (transactionError) throw transactionError;

      if (transactionData?.final_settlement_statement_file) {
        setFinalFile(transactionData.final_settlement_statement_file);

        // Get file URL
        const { data: urlData } = supabase.storage
          .from("document-files")
          .getPublicUrl(transactionData.final_settlement_statement_file);

        setFinalFileUrl(urlData.publicUrl);
      }

      // Load settlement sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from("settlement_sellers")
        .select(
          `
          *,
          seller:transaction_sellers!settlement_sellers_seller_id_fkey(*),
          tax_seller:tax_accounts!settlement_sellers_tax_seller_id_fkey(
            *,
            business_names(*)
          ),
          current_exchange:exchanges!settlement_sellers_current_exchange_id_fkey(
            *,
            exchange_number
          )
        `
        )
        .eq("transaction_id", transactionId);

      if (sellersError) throw sellersError;
      setSettlementSellers((sellersData as any) || []);

      // Load settlement buyers
      const { data: buyersData, error: buyersError } = await supabase
        .from("settlement_buyers")
        .select(
          `
          *,
          buyer:transaction_buyers!settlement_buyers_buyer_id_fkey(
            *,
            profile(*)
          ),
          tax_buyer:tax_accounts!settlement_buyers_tax_buyer_id_fkey(
            *,
            business_names(*)
          ),
          selected_exchange:exchanges!settlement_buyers_selected_exchange_id_fkey(
            *,
            exchange_number
          )
        `
        )
        .eq("transaction_id", transactionId);

      if (buyersError) throw buyersError;
      setSettlementBuyers((buyersData as any) || []);
    } catch (error) {
      console.error("Error loading settlement data:", error);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadDocumentsFromFolder = async () => {
    try {
      // Get repository ID
      const { data: repoData } = await supabase
        .from("document_repositories")
        .select("id")
        .eq("entity_type", "transaction")
        .eq("entity_id", transactionId)
        .single();

      if (!repoData) return;

      // Get Settlement Statement documents folder
      const { data: folderData } = await supabase
        .from("document_folders")
        .select("id")
        .eq("repository_id", repoData.id)
        .eq("name", "Settlement Statement documents")
        .single();

      if (!folderData) return;

      // Get files from folder
      const { data: filesData } = await supabase
        .from("document_files")
        .select("*")
        .eq("folder_id", folderData.id);

      setAvailableDocuments(filesData || []);
      setShowDocumentPicker(true);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Get or create repository
      const { data: repoData } = await supabase
        .from("document_repositories")
        .select("id")
        .eq("entity_type", "transaction")
        .eq("entity_id", transactionId)
        .maybeSingle();

      let repositoryId = repoData?.id;

      if (!repositoryId) {
        const { data: newRepo } = await supabase
          .from("document_repositories")
          .insert({ entity_type: "transaction", entity_id: transactionId })
          .select("id")
          .single();
        repositoryId = newRepo?.id;
      }

      // Get or create Settlement Statement documents folder
      const { data: folderData } = await supabase
        .from("document_folders")
        .select("id")
        .eq("repository_id", repositoryId)
        .eq("name", "Settlement Statement documents")
        .maybeSingle();

      let folderId = folderData?.id;

      if (!folderId) {
        const { data: newFolder } = await supabase
          .from("document_folders")
          .insert({
            repository_id: repositoryId,
            parent_id: null,
            name: "Settlement Statement documents",
          })
          .select("id")
          .single();
        folderId = newFolder?.id;
      }

      // Upload file
      const path = `${repositoryId}/${folderId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("document-files")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Save file record
      await supabase.from("document_files").insert({
        folder_id: folderId,
        name: file.name,
        storage_path: path,
      });

      // Set as final settlement statement
      await setFinalSettlementFile(path);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file");
    }
  };

  const setFinalSettlementFile = async (filePath: string) => {
    try {
      // Update transaction
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ final_settlement_statement_file: filePath })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      // Create settlement sellers for each non-exchange seller
      for (const seller of sellers) {
        if (!seller.non_exchange_name && seller.tax_account_id) {
          // Get seller's exchange for this transaction (Sale type)
          const { data: exchangeData } = await supabase
            .from("exchanges")
            .select(
              `
              id,
              exchange_transactions!inner(transaction_id, transaction_type)
            `
            )
            .eq("tax_account_id", seller.tax_account_id)
            .eq("exchange_transactions.transaction_id", transactionId)
            .eq("exchange_transactions.transaction_type", "Sale")
            .maybeSingle();

          await supabase.from("settlement_sellers").upsert(
            {
              transaction_id: parseInt(transactionId),
              seller_id: seller.id,
              tax_seller_id: seller.tax_account_id,
              current_exchange_id: exchangeData?.id || null,
            },
            { onConflict: "transaction_id,seller_id" }
          );
        }
      }

      // Create settlement buyers for each non-exchange buyer with exchanges
      for (const buyer of buyers) {
        if (!buyer.non_exchange_name && buyer.profile_id) {
          // Get buyer's tax accounts
          const { data: taxAccountsData } = await supabase
            .from("tax_accounts")
            .select("id")
            .eq("profile_id", buyer.profile_id);

          if (taxAccountsData && taxAccountsData.length > 0) {
            // Get exchanges for these tax accounts that are related to this transaction as Purchase
            for (const taxAccount of taxAccountsData) {
              const { data: exchangesData } = await supabase
                .from("exchanges")
                .select(
                  `
                  id,
                  exchange_transactions!inner(transaction_id, transaction_type)
                `
                )
                .eq("tax_account_id", taxAccount.id)
                .eq("exchange_transactions.transaction_id", transactionId)
                .eq("exchange_transactions.transaction_type", "Purchase");

              if (exchangesData && exchangesData.length > 0) {
                for (const exchange of exchangesData) {
                  await supabase.from("settlement_buyers").upsert(
                    {
                      transaction_id: parseInt(transactionId),
                      buyer_id: buyer.id,
                      selected_exchange_id: exchange.id,
                      tax_buyer_id: taxAccount.id,
                    },
                    {
                      onConflict:
                        "transaction_id,buyer_id,selected_exchange_id",
                    }
                  );
                }
              }
            }
          }
        }
      }

      await loadData();
    } catch (error) {
      console.error("Error setting final settlement file:", error);
      alert("Error setting file");
    }
  };

  const selectDocumentFromRepository = async (document: any) => {
    await setFinalSettlementFile(document.storage_path);
    setShowDocumentPicker(false);
  };

  const updateSettlementSeller = async (
    id: string,
    field: string,
    value: any
  ) => {
    try {
      const { error } = await supabase
        .from("settlement_sellers")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error updating settlement seller:", error);
    }
  };

  const updateSettlementBuyer = async (
    id: string,
    field: string,
    value: any
  ) => {
    try {
      const { error } = await supabase
        .from("settlement_buyers")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error updating settlement buyer:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Final Settlement Statement
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* File Upload Section */}
        {!finalFile && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="primary"
              >
                Upload File
              </Button>
              <Button onClick={loadDocumentsFromFolder} variant="outline">
                Select from Documents
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Document Picker Modal */}
        {showDocumentPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Select document from Settlement Statement documents
              </h3>
              <div className="space-y-2">
                {availableDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => selectDocumentFromRepository(doc)}
                  >
                    {doc.name}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setShowDocumentPicker(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* File Preview */}
        {finalFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  File uploaded
                </span>
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="outline"
                  size="small"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </Button>
              </div>
              <Button
                onClick={() => {
                  setFinalFile(null);
                  setFinalFileUrl(null);
                  supabase
                    .from("transactions")
                    .update({ final_settlement_statement_file: null })
                    .eq("id", transactionId);
                }}
                variant="outline"
                size="small"
              >
                Remove
              </Button>
            </div>

            {showPreview && finalFileUrl && (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={finalFileUrl}
                  className="w-full h-[600px]"
                  title="Final Settlement Statement Preview"
                />
              </div>
            )}
          </div>
        )}

        {/* Settlement Sellers and Buyers */}
        {finalFile &&
          (settlementSellers.length > 0 || settlementBuyers.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sellers */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Sellers</h3>
                {settlementSellers.map((seller: any) => (
                  <SettlementSellerCard
                    key={seller.id}
                    seller={seller}
                    onUpdate={updateSettlementSeller}
                    onWireInstructions={() =>
                      setSelectedWireInstructionEntity({
                        type: "seller",
                        id: seller.id,
                        taxUserId: seller.tax_seller_id,
                      })
                    }
                  />
                ))}
              </div>

              {/* Buyers */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Buyers</h3>
                {settlementBuyers.map((buyer: any) => (
                  <SettlementBuyerCard
                    key={buyer.id}
                    buyer={buyer}
                    onUpdate={updateSettlementBuyer}
                    onWireInstructions={() =>
                      setSelectedWireInstructionEntity({
                        type: "buyer",
                        id: buyer.id,
                        taxUserId: buyer.tax_buyer_id,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Wire Instruction Modal */}
      {selectedWireInstructionEntity && (
        <WireInstructionModal
          transactionId={transactionId}
          entityType={selectedWireInstructionEntity.type}
          entityId={selectedWireInstructionEntity.id}
          taxUserId={selectedWireInstructionEntity.taxUserId}
          onClose={() => setSelectedWireInstructionEntity(null)}
          onSuccess={() => {
            setSelectedWireInstructionEntity(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface SettlementSellerCardProps {
  seller: any;
  onUpdate: (id: string, field: string, value: any) => void;
  onWireInstructions: () => void;
}

function SettlementSellerCard({
  seller,
  onUpdate,
  onWireInstructions,
}: SettlementSellerCardProps) {
  const businessNames = seller.tax_seller?.business_names || [];
  const businessName = businessNames.length > 0 ? businessNames[0].name : "N/A";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-gray-900">
            {seller.tax_seller?.name || "N/A"}
          </p>
          <p className="text-sm text-gray-500">
            Title in the name of: {businessName}
          </p>
          {seller.current_exchange && (
            <p className="text-sm text-gray-500">
              Exchange: {seller.current_exchange.exchange_number}
            </p>
          )}
        </div>
        <Button onClick={onWireInstructions} variant="outline" size="small">
          Wiring Instructions
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600">Sale Price:</label>
          <input
            type="number"
            step="0.01"
            value={seller.sale_price || ""}
            onChange={(e) =>
              onUpdate(
                seller.id,
                "sale_price",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Closing Cost:</label>
          <input
            type="number"
            step="0.01"
            value={seller.closing_cost || ""}
            onChange={(e) =>
              onUpdate(
                seller.id,
                "closing_cost",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">DEBT Payoff:</label>
          <input
            type="number"
            step="0.01"
            value={seller.debt_payoff || ""}
            onChange={(e) =>
              onUpdate(
                seller.id,
                "debt_payoff",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Funds to Exchange:</label>
          <input
            type="number"
            step="0.01"
            value={seller.funds_to_exchange || ""}
            onChange={(e) =>
              onUpdate(
                seller.id,
                "funds_to_exchange",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Funds to Exchanger:</label>
          <input
            type="number"
            step="0.01"
            value={seller.funds_to_exchanger || ""}
            onChange={(e) =>
              onUpdate(
                seller.id,
                "funds_to_exchanger",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
      </div>
    </div>
  );
}

interface SettlementBuyerCardProps {
  buyer: any;
  onUpdate: (id: string, field: string, value: any) => void;
  onWireInstructions: () => void;
}

function SettlementBuyerCard({
  buyer,
  onUpdate,
  onWireInstructions,
}: SettlementBuyerCardProps) {
  const businessNames = buyer.tax_buyer?.business_names || [];
  const businessName = businessNames.length > 0 ? businessNames[0].name : "N/A";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-gray-900">
            {buyer.tax_buyer?.name || "N/A"}
          </p>
          <p className="text-sm text-gray-500">
            Title in the name of: {businessName}
          </p>
          {buyer.selected_exchange && (
            <p className="text-sm text-gray-500">
              Exchange: {buyer.selected_exchange.exchange_number}
            </p>
          )}
        </div>
        <Button onClick={onWireInstructions} variant="outline" size="small">
          Wiring Instructions
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600">Sale Price:</label>
          <input
            type="number"
            step="0.01"
            value={buyer.sale_price || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "sale_price",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Closing Cost:</label>
          <input
            type="number"
            step="0.01"
            value={buyer.closing_cost || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "closing_cost",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Loan Amount:</label>
          <input
            type="number"
            step="0.01"
            value={buyer.loan_amount || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "loan_amount",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Funds from Exchange:</label>
          <input
            type="number"
            step="0.01"
            value={buyer.funds_from_exchange || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "funds_from_exchange",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">
            Deposit from Exchange:
          </label>
          <input
            type="number"
            step="0.01"
            value={buyer.deposit_from_exchange || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "deposit_from_exchange",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">
            Deposit from Exchangor:
          </label>
          <input
            type="number"
            step="0.01"
            value={buyer.deposit_from_exchanger || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "deposit_from_exchanger",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-600">
            Replacement of Deposit from QI to Exchangor:
          </label>
          <input
            type="number"
            step="0.01"
            value={buyer.replacement_of_deposit || ""}
            onChange={(e) =>
              onUpdate(
                buyer.id,
                "replacement_of_deposit",
                parseFloat(e.target.value) || null
              )
            }
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
      </div>
    </div>
  );
}
