"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Transaction {
  id: number;
  transaction_number: string;
  contract_purchase_price: number;
  contract_date: string;
  sale_type: string;
  created_at: string;
  status?: string | null;
  estimated_close_date?: string | null;
}

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface TaxAccount {
  id: number;
  name: string;
  profile_id: number;
}

interface BusinessName {
  id: number;
  name: string;
  tax_account_id: number;
}

interface TransactionSeller {
  id: string;
  tax_account_id: number | null;
  vesting_name: string;
  contract_percent: string;
  non_exchange_name: string;
  is_non_exchange?: boolean; // Flag to identify non-exchange sellers
}

interface TransactionBuyer {
  id: string;
  tax_account_id: number | null; // Changed from profile_id to tax_account_id
  exchange_ids: number[]; // Array of exchanges
  contract_percent: string;
  non_exchange_name: string;
  is_non_exchange?: boolean; // Flag to identify non-exchange buyers
}

type ExchangeWithTaxAccount = {
  tax_account:
    | null
    | {
        profile_id: number | null;
      }
    | Array<{
        profile_id: number | null;
      }>;
};

type NewTransactionInsert = {
  transaction_number: string;
  contract_purchase_price: number;
  contract_date: string;
  sale_type: "Property" | "Entity";
  pdf_contract_url?: string | null;
  closing_agent_profile_id?: number;
  status?: string;
  estimated_close_date?: string | null;
};

type PendingOwnershipInsert = {
  property_id: number;
  ownership_type: "pending";
  transaction_id: number;
  tax_account_id?: number;
  vesting_name?: string;
  non_exchange_name?: string | null;
};

export default function TransactionsPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [contractPurchasePrice, setContractPurchasePrice] = useState("");
  const [formattedPrice, setFormattedPrice] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [pdfContractFile, setPdfContractFile] = useState<File | null>(null);
  const [saleType, setSaleType] = useState<"Property" | "Entity">("Property");
  const [propertyId, setPropertyId] = useState<string>("");
  const [propertySearch, setPropertySearch] = useState("");
  const [showCreateProperty, setShowCreateProperty] = useState(false);
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  const [closingAgentId, setClosingAgentId] = useState<string>("");
  const [closingAgentSearch, setClosingAgentSearch] = useState("");
  const [sellers, setSellers] = useState<TransactionSeller[]>([]);
  const [buyers, setBuyers] = useState<TransactionBuyer[]>([]);

  // Search data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [profilesWithExchanges, setProfilesWithExchanges] = useState<Set<number>>(new Set());
  const [taxAccounts, setTaxAccounts] = useState<TaxAccount[]>([]);
  const [taxAccountsWithExchanges, setTaxAccountsWithExchanges] = useState<Set<number>>(new Set());
  const [businessNames, setBusinessNames] = useState<{ [key: string]: BusinessName[] }>({});
  const [availableProperties, setAvailableProperties] = useState<Array<{ id: number; address: string }>>([]);
  const [filteredProperties, setFilteredProperties] = useState<Array<{ id: number; address: string }>>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [showClosingAgentDropdown, setShowClosingAgentDropdown] = useState(false);
  const [sellerTaxAccountSearch, setSellerTaxAccountSearch] = useState<{ [key: string]: string }>({});
  const [buyerTaxAccountSearch, setBuyerTaxAccountSearch] = useState<{ [key: string]: string }>({});
  const [showBuyerDropdown, setShowBuyerDropdown] = useState<{ [key: string]: boolean }>({});
  const [showSellerDropdown, setShowSellerDropdown] = useState<{ [key: string]: boolean }>({});
  const [buyerExchanges, setBuyerExchanges] = useState<{ [key: string]: Array<{ id: number; exchange_number: string; tax_account_id: number }> }>({});
  const [showExchangeDropdown, setShowExchangeDropdown] = useState<{ [key: string]: boolean }>({});

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowClosingAgentDropdown(false);
        setShowBuyerDropdown({});
        setShowSellerDropdown({});
        setShowExchangeDropdown({});
      }
    };

      if (
        showClosingAgentDropdown ||
        showPropertyDropdown ||
        Object.values(showBuyerDropdown).some((v) => v) ||
        Object.values(showSellerDropdown).some((v) => v) ||
        Object.values(showExchangeDropdown).some((v) => v)
      ) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [showClosingAgentDropdown, showPropertyDropdown, showBuyerDropdown, showSellerDropdown, showExchangeDropdown]);

  useEffect(() => {
    if (closingAgentSearch) {
      const filtered = profiles.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(closingAgentSearch.toLowerCase()) ||
          (p.email && p.email.toLowerCase().includes(closingAgentSearch.toLowerCase()))
      );
      setFilteredProfiles(filtered.slice(0, 10));
    } else {
      setFilteredProfiles(profiles.slice(0, 10));
    }
  }, [closingAgentSearch, profiles]);

  useEffect(() => {
    if (propertySearch) {
      const filtered = availableProperties.filter((p) =>
        p.address.toLowerCase().includes(propertySearch.toLowerCase())
      );
      setFilteredProperties(filtered.slice(0, 10));
    } else {
      setFilteredProperties(availableProperties.slice(0, 10));
    }
  }, [propertySearch, availableProperties]);

  // Debug: Log buyerExchanges changes
  useEffect(() => {
    console.log('🔄 buyerExchanges state updated:', buyerExchanges);
  }, [buyerExchanges]);

  // Debug: Log buyers state
  useEffect(() => {
    console.log('👥 Buyers state:', buyers);
  }, [buyers]);


  const loadTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      throw err; // Re-throw to be handled by parent
    }
  }, [supabase]);

  const loadProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profile")
        .select("id, first_name, last_name, email")
        .order("first_name");

      if (error) throw error;
      const profilesList = data || [];
      setProfiles(profilesList);
      setFilteredProfiles(profilesList.slice(0, 10));
    } catch (err) {
      console.error("Failed to load profiles:", err);
      // Don't throw - profiles loading failure shouldn't block page load
      setProfiles([]);
      setFilteredProfiles([]);
    }
  }, [supabase]);

  const loadProfilesWithExchanges = useCallback(async () => {
    try {
      // Get all exchanges with their tax accounts
      const { data: exchangesData, error: exchangesError } = await supabase
        .from("exchanges")
        .select(`
          tax_account_id,
          tax_account:tax_account_id (
            profile_id
          )
        `);

      if (exchangesError) throw exchangesError;

      // Extract unique profile IDs from tax accounts that have exchanges
      const profileIdsWithExchanges = new Set<number>();
      const exchangesRows = (exchangesData ?? []) as ExchangeWithTaxAccount[];

      exchangesRows.forEach((exchange) => {
        const taxAccountInfo = exchange.tax_account;
        const profileId = Array.isArray(taxAccountInfo)
          ? taxAccountInfo[0]?.profile_id
          : taxAccountInfo?.profile_id;

        if (typeof profileId === "number" && !Number.isNaN(profileId)) {
          profileIdsWithExchanges.add(profileId);
        }
      });

      setProfilesWithExchanges(profileIdsWithExchanges);
    } catch (err) {
      console.error("Failed to load profiles with exchanges:", err);
      setProfilesWithExchanges(new Set());
    }
  }, [supabase]);

  const loadTaxAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tax_accounts")
        .select("id, name, profile_id")
        .order("name");

      if (error) throw error;
      setTaxAccounts(data || []);

      // Load which tax accounts have exchanges
      const { data: exchangesData, error: exchangesError } = await supabase
        .from("exchanges")
        .select("tax_account_id");

      if (!exchangesError && exchangesData) {
        const taxAccountIdsWithExchanges = new Set(
          exchangesData.map((e) => e.tax_account_id)
        );
        setTaxAccountsWithExchanges(taxAccountIdsWithExchanges);
        console.log('💼 Tax Accounts with exchanges:', taxAccountIdsWithExchanges);
      }
    } catch (err) {
      console.error("Failed to load tax accounts:", err);
      // Don't throw - tax accounts loading failure shouldn't block page load
      setTaxAccounts([]);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check admin role
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user && isMounted) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("role_type")
              .eq("id", user.id)
              .single();

            if (isMounted) {
              const adminRoles = ["workspace_owner", "platform_super_admin", "admin"];
              setIsAdmin(adminRoles.includes(profile?.role_type || ""));
            }
          }
        } catch (profileErr) {
          console.error("Error checking admin role:", profileErr);
          // Continue even if admin check fails
        }

        // Load all data in parallel
        // Use Promise.allSettled so failures don't block each other
        if (isMounted) {
          await Promise.allSettled([
            loadTransactions(),
            loadProfiles(),
            loadTaxAccounts(),
            loadProfilesWithExchanges(),
          ]);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading transactions data:", err);
          setError(err instanceof Error ? err.message : "Failed to load transactions");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [loadProfiles, loadProfilesWithExchanges, loadTaxAccounts, loadTransactions, supabase]);

  const loadCommonPropertiesForSellers = useCallback(async () => {
    try {
      // Get current sellers and businessNames from state
      const currentSellers = sellers;
      const currentBusinessNames = businessNames;
      
      // Get all business name IDs from sellers who have vesting_name selected
      const sellerBusinessNameIds: number[] = [];
      
      for (const seller of currentSellers) {
        if (!seller.is_non_exchange && seller.tax_account_id && seller.vesting_name) {
          const businessNamesForSeller = currentBusinessNames[seller.id] || [];
          const selectedBusinessName = businessNamesForSeller.find((bn) => bn.name === seller.vesting_name);
          if (selectedBusinessName) {
            sellerBusinessNameIds.push(selectedBusinessName.id);
          }
        }
      }

      if (sellerBusinessNameIds.length === 0) {
        setAvailableProperties([]);
        setFilteredProperties([]);
        return;
      }

      // Get properties for each business name
      const propertiesPromises = sellerBusinessNameIds.map(async (bnId) => {
        const { data, error } = await supabase
          .from("properties")
          .select("id, address")
          .eq("business_name_id", bnId);

        if (error) throw error;
        return data || [];
      });

      const propertiesArrays = await Promise.all(propertiesPromises);
      
      // Find common properties (properties that exist in all arrays)
      if (propertiesArrays.length === 0 || propertiesArrays[0].length === 0) {
        setAvailableProperties([]);
        setFilteredProperties([]);
        return;
      }

      // If only one seller, return all properties for that business name
      if (propertiesArrays.length === 1) {
        setAvailableProperties(propertiesArrays[0]);
        setFilteredProperties(propertiesArrays[0]);
        return;
      }

      // Find common properties (properties that exist in all arrays)
      const commonProperties = propertiesArrays[0].filter((prop) =>
        propertiesArrays.every((arr) => arr.some((p) => p.id === prop.id))
      );

      setAvailableProperties(commonProperties);
      setFilteredProperties(commonProperties);
    } catch (err) {
      console.error("Failed to load common properties:", err);
      setAvailableProperties([]);
      setFilteredProperties([]);
    }
  }, [businessNames, sellers, supabase]);

  const loadBusinessNamesForTaxAccount = useCallback(async (taxAccountId: number) => {
    try {
      const { data, error } = await supabase
        .from("business_names")
        .select("id, name, tax_account_id")
        .eq("tax_account_id", taxAccountId)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to load business names:", err);
      return [];
    }
  }, [supabase]);

  const generateTransactionNumber = async (saleType: "Property" | "Entity"): Promise<string> => {
    const prefix = saleType === "Property" ? "STA" : "ENT";
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    const dateStr = `${month}${day}${year}`;

    // Get count of transactions of this type
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("sale_type", saleType);

    if (error) throw error;
    const sequenceNumber = (count || 0) + 1;

    return `${prefix}${dateStr}-${sequenceNumber}`;
  };

  const generateExchangeNumber = async (taxAccountNumber: string): Promise<string> => {
    const today = new Date();
    const year = today.getFullYear();

    // Get count of all exchanges
    const { count, error } = await supabase
      .from("exchanges")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    const sequenceNumber = (count || 0) + 1;

    return `${taxAccountNumber}-${year}-EXCH-${sequenceNumber}`;
  };

  const uploadPdfContract = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("transactions")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("transactions").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error("Failed to upload PDF contract:", err);
      return null;
    }
  };

  const addSeller = () => {
    const newSeller: TransactionSeller = {
      id: `seller-${Date.now()}`,
      tax_account_id: null,
      vesting_name: "",
      contract_percent: sellers.length === 0 ? "100" : "", // Auto 100% for first seller
      non_exchange_name: "",
      is_non_exchange: false,
    };
    setSellers([...sellers, newSeller]);
  };

  const removeSeller = (id: string) => {
    setSellers(sellers.filter((s) => s.id !== id));
    const newSearch = { ...sellerTaxAccountSearch };
    delete newSearch[id];
    setSellerTaxAccountSearch(newSearch);
  };

  const updateSeller = async (id: string, field: keyof TransactionSeller, value: string | number | null) => {
    const updatedSellers = sellers.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    setSellers(updatedSellers);

    // If tax_account_id is being set, load business names
    if (field === "tax_account_id" && value) {
      const businessNamesData = await loadBusinessNamesForTaxAccount(value as number);
      setBusinessNames((prev) => ({
        ...prev,
        [id]: businessNamesData,
      }));
      // Reset vesting_name when tax_account changes
      const sellerWithReset = updatedSellers.find((s) => s.id === id);
      if (sellerWithReset) {
        sellerWithReset.vesting_name = "";
      }
    }

    // If vesting_name is being set, the useEffect will handle reloading common properties
  };

  // Reload common properties when sellers change
  useEffect(() => {
    if (sellers.length > 0 && saleType === "Property") {
      // Check if all sellers have vesting_name selected
      const allSellersHaveVesting = sellers.every(
        (s) => s.is_non_exchange || (s.tax_account_id && s.vesting_name)
      );
      if (allSellersHaveVesting) {
        void loadCommonPropertiesForSellers();
      } else {
        setAvailableProperties([]);
        setFilteredProperties([]);
      }
    } else {
      setAvailableProperties([]);
      setFilteredProperties([]);
    }
  }, [businessNames, loadCommonPropertiesForSellers, saleType, sellers]);

  const addNonExchangeSeller = () => {
    const newSeller: TransactionSeller = {
      id: `seller-ne-${Date.now()}`,
      tax_account_id: null,
      vesting_name: "",
      contract_percent: sellers.length === 0 ? "100" : "", // Auto 100% for first seller
      non_exchange_name: "",
      is_non_exchange: true, // Mark as non-exchange
    };
    setSellers([...sellers, newSeller]);
  };

  const addBuyer = () => {
    const newBuyer: TransactionBuyer = {
      id: `buyer-${Date.now()}`,
      tax_account_id: null,
      exchange_ids: [],
      contract_percent: buyers.length === 0 ? "100" : "", // Auto 100% for first buyer
      non_exchange_name: "",
      is_non_exchange: false,
    };
    setBuyers([...buyers, newBuyer]);
  };

  const removeBuyer = (id: string) => {
    setBuyers((prevBuyers) => prevBuyers.filter((b) => b.id !== id));
  };

  const updateBuyer = (id: string, field: keyof TransactionBuyer, value: any) => {
    console.log('🔧 Updating buyer:', id, 'field:', field, 'value:', value);
    setBuyers((prevBuyers) =>
      prevBuyers.map((b) => {
        if (b.id === id) {
          const updated = { ...b, [field]: value };
          console.log('✏️ Updated buyer object:', updated);
          return updated;
        }
        return b;
      })
    );
  };

  const toggleBuyerExchange = (buyerId: string, exchangeId: number) => {
    setBuyers((prevBuyers) =>
      prevBuyers.map((b) => {
        if (b.id === buyerId) {
          const currentExchanges = b.exchange_ids || [];
          const isSelected = currentExchanges.includes(exchangeId);
          const updatedBuyer = {
            ...b,
            exchange_ids: isSelected
              ? currentExchanges.filter(id => id !== exchangeId)
              : [...currentExchanges, exchangeId]
          };
          console.log('🔄 Toggle exchange:', exchangeId, 'for buyer:', buyerId, 'tax_account_id preserved:', updatedBuyer.tax_account_id);
          return updatedBuyer;
        }
        return b;
      })
    );
  };

  const addNonExchangeBuyer = () => {
    const newBuyer: TransactionBuyer = {
      id: `buyer-ne-${Date.now()}`,
      tax_account_id: null,
      exchange_ids: [],
      contract_percent: buyers.length === 0 ? "100" : "", // Auto 100% for first buyer
      non_exchange_name: "",
      is_non_exchange: true, // Mark as non-exchange
    };
    setBuyers([...buyers, newBuyer]);
  };

  const getFilteredTaxAccountsForSeller = (sellerId: string) => {
    const search = sellerTaxAccountSearch[sellerId] || "";
    if (!search) return taxAccounts.slice(0, 10);
    return taxAccounts
      .filter((ta) => ta.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  };

  const getFilteredTaxAccountsForBuyer = (buyerId: string) => {
    const search = buyerTaxAccountSearch[buyerId] || "";
    
    // Only show tax accounts that have exchanges
    const taxAccountsWithExchangesList = taxAccounts.filter((ta) => 
      taxAccountsWithExchanges.has(ta.id)
    );
    
    if (!search) return taxAccountsWithExchangesList.slice(0, 10);
    return taxAccountsWithExchangesList
      .filter((ta) => ta.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  };

  const handlePriceChange = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    setContractPurchasePrice(numericValue);
    
    // Format with thousand separators
    if (numericValue) {
      const parts = numericValue.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setFormattedPrice(parts.join('.'));
    } else {
      setFormattedPrice('');
    }
  };

  const loadBuyerExchanges = async (buyerId: string, taxAccountId: number) => {
    try {
      console.log('🔍 Loading exchanges for buyer:', buyerId, 'tax account:', taxAccountId);
      
      // Get exchanges for this tax account
      const { data: exchanges, error: exchangesError } = await supabase
        .from("exchanges")
        .select("id, exchange_number, tax_account_id")
        .eq("tax_account_id", taxAccountId)
        .order("created_at", { ascending: false });

      console.log('🔄 Exchanges found:', exchanges);

      if (exchangesError) {
        console.error("Error fetching exchanges for buyer:", exchangesError);
        setBuyerExchanges((prev) => ({ ...prev, [buyerId]: [] }));
        return;
      }

      setBuyerExchanges((prev) => ({
        ...prev,
        [buyerId]: exchanges || [],
      }));
      
      console.log('✅ Buyer exchanges set:', exchanges?.length || 0);
    } catch (err) {
      console.error("Error loading buyer exchanges:", err);
      setBuyerExchanges((prev) => ({ ...prev, [buyerId]: [] }));
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      // Validation
      if (!contractPurchasePrice || !contractDate || !saleType) {
        throw new Error("All required fields must be filled");
      }

      if (sellers.length === 0) {
        throw new Error("Add at least one seller");
      }

      if (buyers.length === 0) {
        throw new Error("Add at least one buyer");
      }

      // Validate sellers
      for (const seller of sellers) {
        const isNonExchange = seller.is_non_exchange || (seller.non_exchange_name && seller.non_exchange_name.trim() !== "" && !seller.tax_account_id);
        
        if (isNonExchange) {
          // Non-exchange seller: only needs name and contract %
          if (!seller.non_exchange_name || seller.non_exchange_name.trim() === "") {
            throw new Error("Non-exchange seller must have a name");
          }
          if (!seller.contract_percent || parseFloat(seller.contract_percent) <= 0) {
            throw new Error("Non-exchange seller must have a Contract %");
          }
        } else {
          // Regular seller: needs tax account, vesting name, and contract %
          if (!seller.tax_account_id) {
            throw new Error("Each seller must have a Tax Account");
          }
          if (!seller.vesting_name || seller.vesting_name.trim() === "") {
            throw new Error("Each seller must have a Vesting Name");
          }
          if (!seller.contract_percent || parseFloat(seller.contract_percent) <= 0) {
            throw new Error("Each seller must have a Contract %");
          }
        }
      }

      // Validate property for Property transactions
      if (saleType === "Property") {
        if (showCreateProperty) {
          if (!newPropertyAddress || newPropertyAddress.trim() === "") {
            throw new Error("Property address is required");
          }
        } else {
          if (!propertyId) {
            throw new Error("Property must be selected or created for Property transactions");
          }
        }
      }

      // Validate buyers
      console.log('🔍 Validating buyers:', buyers);
      for (const buyer of buyers) {
        console.log('👤 Checking buyer:', buyer);
        const isNonExchange = buyer.is_non_exchange || (buyer.non_exchange_name && buyer.non_exchange_name.trim() !== "" && !buyer.tax_account_id);
        console.log('   isNonExchange:', isNonExchange);
        console.log('   tax_account_id:', buyer.tax_account_id);
        console.log('   exchange_ids:', buyer.exchange_ids);
        
        if (isNonExchange) {
          // Non-exchange buyer: only needs name and contract %
          if (!buyer.non_exchange_name || buyer.non_exchange_name.trim() === "") {
            throw new Error("Non-exchange buyer must have a name");
          }
          if (!buyer.contract_percent || parseFloat(buyer.contract_percent) <= 0) {
            throw new Error("Non-exchange buyer must have a Contract %");
          }
        } else {
          // Regular buyer: needs tax account, contract %, and must have at least one exchange
          if (!buyer.tax_account_id) {
            console.error('❌ Buyer missing tax_account_id:', buyer);
            throw new Error("Each buyer must have a Tax Account");
          }
          if (!buyer.contract_percent || parseFloat(buyer.contract_percent) <= 0) {
            throw new Error("Each buyer must have a Contract %");
          }
          // Check if at least one exchange is selected
          if (!buyer.exchange_ids || buyer.exchange_ids.length === 0) {
            throw new Error(`Buyer must have at least one exchange selected.`);
          }
        }
      }

      // Upload PDF contract if provided
      let pdfUrl = null;
      if (pdfContractFile) {
        pdfUrl = await uploadPdfContract(pdfContractFile);
        if (!pdfUrl) {
          throw new Error("Failed to upload PDF contract");
        }
      }

      // Generate transaction number
      const transactionNumber = await generateTransactionNumber(saleType);

      const parsedPurchasePrice = Number.parseFloat(contractPurchasePrice);

      if (Number.isNaN(parsedPurchasePrice) || parsedPurchasePrice <= 0) {
        throw new Error("Contract Purchase Price must be a positive number");
      }

      const transactionInsert: NewTransactionInsert = {
        transaction_number: transactionNumber,
        contract_purchase_price: parsedPurchasePrice,
        contract_date: contractDate,
        sale_type: saleType,
        status: 'Pending',
      };

      if (pdfUrl) {
        transactionInsert.pdf_contract_url = pdfUrl;
      }

      if (closingAgentId) {
        const parsedClosingAgentId = Number.parseInt(closingAgentId, 10);
        if (!Number.isNaN(parsedClosingAgentId)) {
          transactionInsert.closing_agent_profile_id = parsedClosingAgentId;
        }
      }

      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert(transactionInsert)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create sellers
      const sellersData = sellers.map((seller) => ({
        transaction_id: transaction.id,
        tax_account_id: seller.tax_account_id || null,
        vesting_name: seller.vesting_name || null,
        contract_percent: parseFloat(seller.contract_percent),
        non_exchange_name: seller.non_exchange_name || null,
      }));

      if (sellersData.length > 0) {
        const { error: sellersError } = await supabase
          .from("transaction_sellers")
          .insert(sellersData);

        if (sellersError) throw sellersError;
      }

      // Create buyers - need to get profile_id from tax_account
      const buyersData = await Promise.all(buyers.map(async (buyer) => {
        let profileId = null;
        
        if (buyer.tax_account_id) {
          const { data: taxAccount } = await supabase
            .from("tax_accounts")
            .select("profile_id")
            .eq("id", buyer.tax_account_id)
            .single();
          
          profileId = taxAccount?.profile_id || null;
        }
        
        return {
          transaction_id: transaction.id,
          profile_id: profileId,
          contract_percent: parseFloat(buyer.contract_percent),
          non_exchange_name: buyer.non_exchange_name || null,
        };
      }));

      if (buyersData.length > 0) {
        const { error: buyersError } = await supabase
          .from("transaction_buyers")
          .insert(buyersData);

        if (buyersError) throw buyersError;
      }

      // Create exchanges for system sellers (with tax_account_id) and buyers (with profile_id)
      
      // Create exchanges for sellers
      for (const seller of sellers) {
        // Check if seller is non-exchange (similar to validation logic)
        const isNonExchangeSeller = seller.is_non_exchange || 
          (seller.non_exchange_name && seller.non_exchange_name.trim() !== "" && !seller.tax_account_id);
        
        if (seller.tax_account_id && !isNonExchangeSeller) {
          try {
            // Get tax account to get account_number
            const { data: taxAccount, error: taxAccountError } = await supabase
              .from("tax_accounts")
              .select("account_number")
              .eq("id", seller.tax_account_id)
              .single();

            if (taxAccountError) {
              console.error(`Error fetching tax account for seller: ${taxAccountError.message}`);
              continue;
            }

            if (!taxAccount?.account_number) {
              console.error(`Tax account ${seller.tax_account_id} does not have an account_number`);
              continue;
            }

            const exchangeNumber = await generateExchangeNumber(taxAccount.account_number);

            const { data: exchange, error: exchangeError } = await supabase
              .from("exchanges")
              .insert({
                exchange_number: exchangeNumber,
                tax_account_id: seller.tax_account_id,
                status: 'Pending',
              })
              .select()
              .single();

            if (exchangeError) {
              console.error(`Error creating exchange for seller: ${exchangeError.message}`);
              continue;
            }

            if (exchange) {
              // Link exchange to transaction as Sale
              const { error: linkError } = await supabase.from("exchange_transactions").insert({
                exchange_id: exchange.id,
                transaction_id: transaction.id,
                transaction_type: "Sale",
              });

              if (linkError) {
                console.error(`Error linking exchange to transaction: ${linkError.message}`);
              }
            }
          } catch (err) {
            console.error(`Error creating exchange for seller:`, err);
            // Continue with next seller instead of failing entire transaction
          }
        }
      }

      // For buyers, link existing exchanges to transaction
      for (const buyer of buyers) {
        // Check if buyer is non-exchange
        const isNonExchangeBuyer = buyer.is_non_exchange || 
          (buyer.non_exchange_name && buyer.non_exchange_name.trim() !== "" && !buyer.tax_account_id);
        
        if (buyer.tax_account_id && !isNonExchangeBuyer) {
          try {
            // Use the selected exchanges (can be multiple)
            if (!buyer.exchange_ids || buyer.exchange_ids.length === 0) {
              console.error(`Buyer does not have any exchanges selected`);
              continue;
            }

            // Link all selected exchanges to transaction as Purchase
            for (const exchangeId of buyer.exchange_ids) {
              const { error: linkError } = await supabase.from("exchange_transactions").insert({
                exchange_id: exchangeId,
                transaction_id: transaction.id,
                transaction_type: "Purchase",
              });

              if (linkError) {
                console.error(`Error linking exchange ${exchangeId} to transaction: ${linkError.message}`);
              }
            }
          } catch (err) {
            console.error(`Error linking exchange for buyer:`, err);
            // Continue with next buyer instead of failing entire transaction
          }
        }
      }

      // Create property if needed
      let finalPropertyId = propertyId;
      
      if (saleType === "Property" && showCreateProperty && newPropertyAddress) {
        // Create new property
        const { data: newProperty, error: propertyError } = await supabase
          .from("properties")
          .insert({ address: newPropertyAddress.trim() })
          .select("id")
          .single();

        if (propertyError) throw propertyError;
        finalPropertyId = newProperty.id.toString();

        // Create current ownership for all sellers
        const currentOwnershipPromises = sellers.map(async (seller) => {
          const isNonExchangeSeller = seller.is_non_exchange || 
            (seller.non_exchange_name && seller.non_exchange_name.trim() !== "" && !seller.tax_account_id);

          const ownershipData: any = {
            property_id: newProperty.id,
            ownership_type: "current",
            transaction_id: transaction.id,
          };

          if (isNonExchangeSeller) {
            ownershipData.non_exchange_name = seller.non_exchange_name;
          } else if (seller.tax_account_id) {
            ownershipData.tax_account_id = seller.tax_account_id;
            if (seller.vesting_name) {
              ownershipData.vesting_name = seller.vesting_name;
            }
          }

          return supabase.from("property_ownership").insert([ownershipData]);
        });

        await Promise.all(currentOwnershipPromises);
      }

      // Create pending ownership for buyers if this is a Property transaction
      if (saleType === "Property" && finalPropertyId) {
        const parsedPropertyId = Number.parseInt(finalPropertyId, 10);

        if (Number.isNaN(parsedPropertyId)) {
          throw new Error("Invalid property id");
        }

        const pendingOwnershipPromises = buyers.map(async (buyer) => {
          const ownershipData: PendingOwnershipInsert = {
            property_id: parsedPropertyId,
            ownership_type: "pending",
            transaction_id: transaction.id,
          };

          if (buyer.is_non_exchange || (buyer.non_exchange_name && buyer.non_exchange_name.trim() !== "" && !buyer.tax_account_id)) {
            ownershipData.non_exchange_name = buyer.non_exchange_name;
          } else if (buyer.tax_account_id) {
            ownershipData.tax_account_id = buyer.tax_account_id;
            
            // Get first business name (vesting name) for this tax account
            const { data: businessNames } = await supabase
              .from("business_names")
              .select("name")
              .eq("tax_account_id", buyer.tax_account_id)
              .limit(1);

            if (businessNames && businessNames.length > 0) {
              ownershipData.vesting_name = businessNames[0].name;
            }
          }

          return supabase.from("property_ownership").insert([ownershipData]);
        });

        await Promise.all(pendingOwnershipPromises);
      }

      setSuccess("Transaction created successfully!");
      setShowCreateModal(false);
      resetForm();
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setContractPurchasePrice("");
    setFormattedPrice("");
    setContractDate("");
    setPdfContractFile(null);
    setSaleType("Property");
    setPropertyId("");
    setPropertySearch("");
    setShowCreateProperty(false);
    setNewPropertyAddress("");
    setClosingAgentId("");
    setClosingAgentSearch("");
    setSellers([]);
    setBuyers([]);
    setSellerTaxAccountSearch({});
    setBuyerTaxAccountSearch({});
    setShowBuyerDropdown({});
    setShowSellerDropdown({});
    setShowPropertyDropdown(false);
    setBusinessNames({});
    setAvailableProperties([]);
    setFilteredProperties([]);
  };

  const getSelectedClosingAgent = () => {
    if (!closingAgentId) return null;
    return profiles.find((p) => p.id.toString() === closingAgentId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              + Create Transaction
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/transactions/${transaction.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.transaction_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${transaction.contract_purchase_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.contract_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.sale_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Transaction Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Create Transaction
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                      setError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-3xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateTransaction}>
                  <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    {/* First row: Contract Purchase Price and Contract Date */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Contract Purchase Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contract Purchase Price (in dollars) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                          <input
                            type="text"
                            value={formattedPrice}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            required
                            className="w-full px-4 py-2 pl-7 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Contract Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contract Date *
                        </label>
                        <input
                          type="date"
                          value={contractDate}
                          onChange={(e) => setContractDate(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Second row: PDF Contract and Sale Type */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* PDF Contract */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          PDF Contract
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPdfContractFile(e.target.files?.[0] || null)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {pdfContractFile && (
                          <p className="mt-1 text-sm text-gray-500">
                            Selected file: {pdfContractFile.name}
                          </p>
                        )}
                      </div>

                      {/* Sale Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sale Type *
                        </label>
                        <select
                          value={saleType}
                          onChange={(e) => {
                            setSaleType(e.target.value as "Property" | "Entity");
                            if (e.target.value === "Entity") {
                              setPropertyId("");
                              setPropertySearch("");
                            }
                          }}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Property">Property</option>
                          <option value="Entity">Entity</option>
                        </select>
                      </div>
                    </div>


                    {/* Closing Agent */}
                    <div className="relative dropdown-container">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Closing Agent
                      </label>
                      <input
                        type="text"
                        value={closingAgentSearch}
                        onChange={(e) => {
                          setClosingAgentSearch(e.target.value);
                          setShowClosingAgentDropdown(true);
                        }}
                        onFocus={() => setShowClosingAgentDropdown(true)}
                        placeholder="Search profile..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {getSelectedClosingAgent() && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            {getSelectedClosingAgent()?.first_name} {getSelectedClosingAgent()?.last_name}
                            {getSelectedClosingAgent()?.email && ` (${getSelectedClosingAgent()?.email})`}
                          </p>
                        </div>
                      )}
                      {showClosingAgentDropdown && filteredProfiles.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredProfiles.map((profile) => (
                            <div
                              key={profile.id}
                              onClick={() => {
                                setClosingAgentId(profile.id.toString());
                                setClosingAgentSearch(`${profile.first_name} ${profile.last_name}`);
                                setShowClosingAgentDropdown(false);
                              }}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {profile.first_name} {profile.last_name}
                              </p>
                              {profile.email && (
                                <p className="text-xs text-gray-500">{profile.email}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sellers */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Sellers</h4>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={addSeller}
                            variant="outline"
                            size="small"
                          >
                            + Add Seller
                          </Button>
                          <Button
                            type="button"
                            onClick={addNonExchangeSeller}
                            variant="outline"
                            size="small"
                          >
                            + Non-Exchange Seller
                          </Button>
                        </div>
                      </div>

                      {sellers.map((seller, index) => {
                        // Determine if seller is non-exchange: either flagged or has non_exchange_name filled
                        const isNonExchange = seller.is_non_exchange || (seller.non_exchange_name !== "" && !seller.tax_account_id);
                        const filteredTaxAccounts = getFilteredTaxAccountsForSeller(seller.id);
                        const selectedTaxAccount = seller.tax_account_id
                          ? taxAccounts.find((ta) => ta.id === seller.tax_account_id)
                          : null;

                        return (
                          <div key={seller.id} className="mb-6 p-4 border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-700">
                                Seller {index + 1}
                              </h5>
                              <button
                                type="button"
                                onClick={() => removeSeller(seller.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>

                            {!isNonExchange ? (
                              <>
                                <div className="mb-3 relative dropdown-container">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tax Account *
                                  </label>
                                  <input
                                    type="text"
                                    value={sellerTaxAccountSearch[seller.id] || (selectedTaxAccount ? selectedTaxAccount.name : "")}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const currentName = selectedTaxAccount ? selectedTaxAccount.name : "";
                                      
                                      // Only reset tax_account_id if the text actually changed from the selected value
                                      if (newValue !== currentName) {
                                        updateSeller(seller.id, "tax_account_id", null);
                                      }
                                      
                                      const newSearch = { ...sellerTaxAccountSearch };
                                      newSearch[seller.id] = newValue;
                                      setSellerTaxAccountSearch(newSearch);
                                      
                                      const newShow = { ...showSellerDropdown };
                                      newShow[seller.id] = true;
                                      setShowSellerDropdown(newShow);
                                    }}
                                    onFocus={() => {
                                      const newShow = { ...showSellerDropdown };
                                      newShow[seller.id] = true;
                                      setShowSellerDropdown(newShow);
                                    }}
                                    placeholder="Search Tax Account..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  {selectedTaxAccount && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                      <p className="text-sm text-gray-700">{selectedTaxAccount.name}</p>
                                    </div>
                                  )}
                                  {showSellerDropdown[seller.id] && filteredTaxAccounts.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                      {filteredTaxAccounts.map((ta) => (
                                        <div
                                          key={ta.id}
                                          onClick={async () => {
                                            await updateSeller(seller.id, "tax_account_id", ta.id);
                                            const newSearch = { ...sellerTaxAccountSearch };
                                            newSearch[seller.id] = ta.name;
                                            setSellerTaxAccountSearch(newSearch);
                                            const newShow = { ...showSellerDropdown };
                                            newShow[seller.id] = false;
                                            setShowSellerDropdown(newShow);
                                          }}
                                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        >
                                          <p className="text-sm font-medium text-gray-900">{ta.name}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vesting Name * (Business Name)
                                  </label>
                                  <select
                                    value={seller.vesting_name}
                                    onChange={(e) => updateSeller(seller.id, "vesting_name", e.target.value)}
                                    required={!!seller.tax_account_id}
                                    disabled={!seller.tax_account_id || !businessNames[seller.id] || businessNames[seller.id].length === 0}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  >
                                    <option value="">
                                      {!seller.tax_account_id
                                        ? "-- Select Tax Account first --"
                                        : !businessNames[seller.id] || businessNames[seller.id].length === 0
                                        ? "-- Loading... --"
                                        : "-- Select Vesting Name --"}
                                    </option>
                                    {(businessNames[seller.id] || []).map((bn) => (
                                      <option key={bn.id} value={bn.name}>
                                        {bn.name}
                                      </option>
                                    ))}
                                  </select>
                                  {seller.tax_account_id && (!businessNames[seller.id] || businessNames[seller.id].length === 0) && (
                                    <p className="mt-1 text-xs text-yellow-600">
                                      ⚠ This Tax Account has no Business Names. Create a Business Name for this Tax Account.
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Non-Exchange Seller Name *
                                </label>
                                <input
                                  type="text"
                                  value={seller.non_exchange_name}
                                  onChange={(e) => updateSeller(seller.id, "non_exchange_name", e.target.value)}
                                  required
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Enter non-exchange seller name"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contract % *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={seller.contract_percent}
                                onChange={(e) => updateSeller(seller.id, "contract_percent", e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Buyers */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Buyers</h4>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={addBuyer}
                            variant="outline"
                            size="small"
                          >
                            + Add Buyer
                          </Button>
                          <Button
                            type="button"
                            onClick={addNonExchangeBuyer}
                            variant="outline"
                            size="small"
                          >
                            + Non-Exchange Buyer
                          </Button>
                        </div>
                      </div>

                      {buyers.map((buyer, index) => {
                        // Determine if buyer is non-exchange: either flagged or has non_exchange_name filled
                        const isNonExchange = buyer.is_non_exchange || (buyer.non_exchange_name !== "" && !buyer.tax_account_id);
                        const selectedTaxAccount = buyer.tax_account_id
                          ? taxAccounts.find((ta) => ta.id === buyer.tax_account_id)
                          : null;

                        return (
                          <div key={buyer.id} className="mb-6 p-4 border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-700">
                                Buyer {index + 1}
                              </h5>
                              <button
                                type="button"
                                onClick={() => removeBuyer(buyer.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>

                            {!isNonExchange ? (
                              <>
                              <div className="mb-3 relative dropdown-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Tax Account *
                                </label>
                                <input
                                  type="text"
                                  value={buyerTaxAccountSearch[buyer.id] || (selectedTaxAccount ? selectedTaxAccount.name : "")}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    const currentName = selectedTaxAccount ? selectedTaxAccount.name : "";
                                    
                                    // Only reset tax_account_id if the text actually changed from the selected value
                                    if (newValue !== currentName) {
                                      updateBuyer(buyer.id, "tax_account_id", null);
                                      updateBuyer(buyer.id, "exchange_ids", []);
                                    }
                                    
                                    const newSearch = { ...buyerTaxAccountSearch };
                                    newSearch[buyer.id] = newValue;
                                    setBuyerTaxAccountSearch(newSearch);
                                    
                                    const newShow = { ...showBuyerDropdown };
                                    newShow[buyer.id] = true;
                                    setShowBuyerDropdown(newShow);
                                  }}
                                  onFocus={() => {
                                    const newShow = { ...showBuyerDropdown };
                                    newShow[buyer.id] = true;
                                    setShowBuyerDropdown(newShow);
                                  }}
                                  placeholder="Search tax account..."
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {selectedTaxAccount && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                    <p className="text-sm text-gray-700">
                                      {selectedTaxAccount.name}
                                    </p>
                                  </div>
                                )}
                                {showBuyerDropdown[buyer.id] && getFilteredTaxAccountsForBuyer(buyer.id).length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {getFilteredTaxAccountsForBuyer(buyer.id).map((taxAccount) => (
                                      <div
                                        key={taxAccount.id}
                                        onClick={async () => {
                                          console.log('✅ Selecting tax account for buyer:', buyer.id, 'Tax Account ID:', taxAccount.id, 'Name:', taxAccount.name);
                                          
                                          // Update both fields at once to avoid race condition
                                          setBuyers((prevBuyers) => {
                                            const updated = prevBuyers.map((b) => {
                                              if (b.id === buyer.id) {
                                                const updatedBuyer = {
                                                  ...b,
                                                  tax_account_id: taxAccount.id,
                                                  exchange_ids: [] // Reset exchanges when tax account changes
                                                };
                                                console.log('✏️ Buyer after tax account selection:', updatedBuyer);
                                                return updatedBuyer;
                                              }
                                              return b;
                                            });
                                            console.log('📋 All buyers after update:', updated);
                                            return updated;
                                          });
                                          
                                          const newSearch = { ...buyerTaxAccountSearch };
                                          newSearch[buyer.id] = taxAccount.name;
                                          setBuyerTaxAccountSearch(newSearch);
                                          const newShow = { ...showBuyerDropdown };
                                          newShow[buyer.id] = false;
                                          setShowBuyerDropdown(newShow);
                                          
                                          // Load exchanges for this buyer's tax account
                                          await loadBuyerExchanges(buyer.id, taxAccount.id);
                                        }}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                      >
                                        <p className="text-sm font-medium text-gray-900">{taxAccount.name}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Exchange Selection - Multiple Choice */}
                              {buyerExchanges[buyer.id] ? (
                                  <div className="mt-4 mb-3 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      🎯 Exchanges * (select at least one)
                                    </label>
                                    {buyerExchanges[buyer.id].length === 0 ? (
                                      <div className="border border-yellow-300 bg-yellow-50 rounded-md p-3">
                                        <p className="text-sm text-yellow-800 font-medium">
                                          ⚠️ This profile has no exchanges. Create an exchange for this profile.
                                        </p>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="border border-gray-300 rounded-md p-3 space-y-2 max-h-60 overflow-y-auto bg-white">
                                          {buyerExchanges[buyer.id].map((exchange) => (
                                            <label
                                              key={exchange.id}
                                              className="flex items-center space-x-3 p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={buyer.exchange_ids?.includes(exchange.id) || false}
                                                onChange={() => toggleBuyerExchange(buyer.id, exchange.id)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                              />
                                              <span className="text-sm font-medium text-gray-900">
                                                {exchange.exchange_number}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                        {buyer.exchange_ids && buyer.exchange_ids.length > 0 ? (
                                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm font-medium text-green-800">
                                              ✓ Selected: {buyer.exchange_ids.length} exchange(s)
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                            <p className="text-sm font-medium text-red-800">
                                              ⚠ Select at least one exchange
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                              ) : null}
                              </>
                            ) : (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Non-Exchange Buyer Name *
                                </label>
                                <input
                                  type="text"
                                  value={buyer.non_exchange_name}
                                  onChange={(e) => updateBuyer(buyer.id, "non_exchange_name", e.target.value)}
                                  required
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Enter non-exchange buyer name"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contract % *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={buyer.contract_percent}
                                onChange={(e) => updateBuyer(buyer.id, "contract_percent", e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Property Selection (only for Property type, after Buyers) */}
                    {saleType === "Property" && (
                      <div className="border-t pt-6">
                        <div className="mb-4 flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">Property</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Select existing property or create new one
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setShowCreateProperty(!showCreateProperty)}
                            variant="outline"
                            size="small"
                          >
                            {showCreateProperty ? "Cancel" : "+ Create New Property"}
                          </Button>
                        </div>

                        {/* Create New Property Form */}
                        {showCreateProperty ? (
                          <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              New Property Address *
                            </label>
                            <input
                              type="text"
                              value={newPropertyAddress}
                              onChange={(e) => setNewPropertyAddress(e.target.value)}
                              placeholder="Enter property address"
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-2 text-sm text-gray-600">
                              Sellers will be set as current owners of this property
                            </p>
                          </div>
                        ) : (
                        <div className="relative dropdown-container">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Property *
                          </label>
                          <input
                            type="text"
                            value={propertySearch}
                            onChange={(e) => {
                              setPropertySearch(e.target.value);
                              setShowPropertyDropdown(true);
                              const filtered = availableProperties.filter((p) =>
                                p.address.toLowerCase().includes(e.target.value.toLowerCase())
                              );
                              setFilteredProperties(filtered.slice(0, 10));
                            }}
                            onFocus={() => setShowPropertyDropdown(true)}
                            placeholder="Search property..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={saleType === "Property"}
                            disabled={availableProperties.length === 0}
                          />
                          {propertyId && availableProperties.find((p) => p.id.toString() === propertyId) && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md">
                              <p className="text-sm text-gray-700">
                                {availableProperties.find((p) => p.id.toString() === propertyId)?.address}
                              </p>
                            </div>
                          )}
                          {availableProperties.length === 0 && sellers.some((s) => !s.is_non_exchange && s.tax_account_id && s.vesting_name) && (
                            <p className="mt-2 text-sm text-gray-500">
                              No common properties found. Please ensure all sellers have selected vesting names and that there are properties linked to those vesting names.
                            </p>
                          )}
                          {showPropertyDropdown && filteredProperties.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                              {filteredProperties.map((property) => (
                                <div
                                  key={property.id}
                                  onClick={() => {
                                    setPropertyId(property.id.toString());
                                    setPropertySearch(property.address);
                                    setShowPropertyDropdown(false);
                                  }}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  <p className="text-sm font-medium text-gray-900">
                                    {property.address}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                        setError(null);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      variant="primary"
                    >
                      {isCreating ? "Creating..." : "Create Transaction"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
