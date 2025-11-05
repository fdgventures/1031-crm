"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import { IdentificationType, PropertyType } from "@/types/identified-property.types";

interface AddPropertyModalProps {
  exchangeId: number;
  identificationType: IdentificationType;
  onClose: () => void;
  onSuccess: () => void;
}

type SelectionMode = 'upload' | 'digital';

export default function AddPropertyModal({
  exchangeId,
  identificationType,
  onClose,
  onSuccess
}: AddPropertyModalProps) {
  const supabase = getSupabaseClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('digital');
  const [propertyType, setPropertyType] = useState<PropertyType>('standard_address');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  // Property search/create
  const [propertySearch, setPropertySearch] = useState("");
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [showCreateProperty, setShowCreateProperty] = useState(false);
  const [newPropertyAddress, setNewPropertyAddress] = useState("");
  
  // Property details
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [percentage, setPercentage] = useState("");
  const [isParked, setIsParked] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === 3) {
      loadProperties();
    }
  }, [step]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("address");
      
      if (error) throw error;
      setAvailableProperties(data || []);
    } catch (err) {
      console.error("Failed to load properties:", err);
    }
  };

  const filteredProperties = availableProperties.filter((property) =>
    property.address.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleCreateProperty = async () => {
    if (!newPropertyAddress.trim()) {
      setError("Please enter property address");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("properties")
        .insert({ address: newPropertyAddress.trim() })
        .select()
        .single();

      if (error) throw error;
      
      setSelectedPropertyId(data.id);
      setShowCreateProperty(false);
      setNewPropertyAddress("");
      await loadProperties();
    } catch (err) {
      console.error("Failed to create property:", err);
      setError("Failed to create property");
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (selectionMode === 'digital' && propertyType === 'standard_address' && !selectedPropertyId) {
        throw new Error("Please select a property");
      }

      let documentPath: string | null = null;

      // Upload document if provided
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `${exchangeId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, documentFile);

        if (uploadError) throw uploadError;
        documentPath = fileName;
      }

      // Create identified property
      const insertData: any = {
        exchange_id: exchangeId,
        identification_type: identificationType,
        property_type: propertyType,
        description: description || null,
        value: value ? parseFloat(value) : null,
        percentage: percentage ? parseFloat(percentage) : null,
        is_parked: isParked,
        document_storage_path: documentPath,
        identification_date: new Date().toISOString().split('T')[0]
      };

      if (propertyType === 'standard_address' && selectedPropertyId) {
        insertData.property_id = selectedPropertyId;
      }

      const { error: insertError } = await supabase
        .from("identified_properties")
        .insert(insertData);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to add property:", err);
      setError(err instanceof Error ? err.message : "Failed to add property");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Add {identificationType === 'written_form' ? 'Written Identification' : 'Identified by Contract'}
          </h2>
          <div className="text-sm text-gray-600 mt-1">Step {step} of 3</div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Selection Mode */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">How would you like to identify this property?</h3>
              
              <button
                onClick={() => setSelectionMode('upload')}
                className={`w-full p-6 border-2 rounded-lg text-left transition-colors ${
                  selectionMode === 'upload'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    checked={selectionMode === 'upload'}
                    onChange={() => setSelectionMode('upload')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">📄 Upload Document</div>
                    <div className="text-sm text-gray-600">
                      Upload a signed identification form or contract document
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectionMode('digital')}
                className={`w-full p-6 border-2 rounded-lg text-left transition-colors ${
                  selectionMode === 'digital'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    checked={selectionMode === 'digital'}
                    onChange={() => setSelectionMode('digital')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">💻 Choose Digitally</div>
                    <div className="text-sm text-gray-600">
                      Select properties from your system or create new ones
                    </div>
                  </div>
                </div>
              </button>

              {selectionMode === 'upload' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Document
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Property Type */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Select Property Type</h3>
              
              <button
                onClick={() => setPropertyType('standard_address')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  propertyType === 'standard_address'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={propertyType === 'standard_address'}
                    onChange={() => setPropertyType('standard_address')}
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Standard Address</div>
                    <div className="text-sm text-gray-600">Regular property with physical address</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPropertyType('dst')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  propertyType === 'dst'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={propertyType === 'dst'}
                    onChange={() => setPropertyType('dst')}
                  />
                  <div>
                    <div className="font-semibold text-gray-900">DST</div>
                    <div className="text-sm text-gray-600">Delaware Statutory Trust</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPropertyType('membership_interest')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  propertyType === 'membership_interest'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={propertyType === 'membership_interest'}
                    onChange={() => setPropertyType('membership_interest')}
                  />
                  <div>
                    <div className="font-semibold text-gray-900">100% Membership Interest</div>
                    <div className="text-sm text-gray-600">Full ownership interest in LLC/entity</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 3: Property Selection/Details */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Property Selection (for standard_address only) */}
              {propertyType === 'standard_address' && !showCreateProperty && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Property
                  </label>
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    placeholder="Search properties..."
                    className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                  />
                  
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded">
                    {filteredProperties.map((property) => (
                      <button
                        key={property.id}
                        onClick={() => setSelectedPropertyId(property.id)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                          selectedPropertyId === property.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        {property.address}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowCreateProperty(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Create New Property
                  </button>
                </div>
              )}

              {showCreateProperty && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Property Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPropertyAddress}
                      onChange={(e) => setNewPropertyAddress(e.target.value)}
                      placeholder="Enter property address"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    />
                    <Button onClick={handleCreateProperty} variant="primary">Create</Button>
                    <Button onClick={() => setShowCreateProperty(false)} variant="outline">Cancel</Button>
                  </div>
                </div>
              )}

              {/* Property Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Additional property description or notes"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isParked}
                    onChange={(e) => setIsParked(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Mark as Parked</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {step > 1 && (
              <Button onClick={handleBack} variant="outline" disabled={isLoading}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
            
            {step < 3 ? (
              <Button onClick={handleNext} variant="primary">
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} variant="primary" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Property"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

