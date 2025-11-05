"use client";

import React from "react";
import { ExchangeRuleStatus } from "@/types/identified-property.types";

interface ExchangeRuleIndicatorProps {
  ruleStatus: ExchangeRuleStatus;
}

export default function ExchangeRuleIndicator({ ruleStatus }: ExchangeRuleIndicatorProps) {
  const getRuleDescription = () => {
    switch (ruleStatus.activeRule) {
      case '3_property':
        return {
          title: "3 Property Rule",
          description: "You may identify up to 3 replacement properties of any value.",
          limit: "Maximum: 3 properties"
        };
      case '200_percent':
        return {
          title: "200% Rule",
          description: "You may identify any number of properties, but their total value cannot exceed 200% of the relinquished property value.",
          limit: `Maximum Value: $${(ruleStatus.totalSaleValue * 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        };
      case '95_percent':
        return {
          title: "95% Rule",
          description: "You have exceeded the 200% limit. You must acquire at least 95% of the total identified property value.",
          limit: `Must Acquire: $${(ruleStatus.totalIdentifiedValue * 0.95).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        };
      case 'compliant':
        return {
          title: "Compliant",
          description: "Your identification is compliant with IRS rules.",
          limit: ""
        };
      default:
        return {
          title: "No Properties Identified",
          description: "Start by identifying replacement properties within 45 days of closing.",
          limit: ""
        };
    }
  };

  const rule = getRuleDescription();
  const isWarning = ruleStatus.violations.length > 0;
  const hasWarnings = ruleStatus.warnings.length > 0;

  return (
    <div className={`rounded-lg border-2 p-6 mb-6 ${
      isWarning 
        ? 'border-red-500 bg-red-50' 
        : hasWarnings 
        ? 'border-yellow-500 bg-yellow-50'
        : 'border-blue-500 bg-blue-50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={`text-xl font-bold ${
              isWarning ? 'text-red-900' : hasWarnings ? 'text-yellow-900' : 'text-blue-900'
            }`}>
              {rule.title}
            </h3>
            {ruleStatus.isCompliant && !isWarning && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                ✓ Compliant
              </span>
            )}
          </div>
          
          <p className={`text-sm mb-3 ${
            isWarning ? 'text-red-800' : hasWarnings ? 'text-yellow-800' : 'text-blue-800'
          }`}>
            {rule.description}
          </p>

          {rule.limit && (
            <p className={`text-sm font-semibold ${
              isWarning ? 'text-red-900' : hasWarnings ? 'text-yellow-900' : 'text-blue-900'
            }`}>
              {rule.limit}
            </p>
          )}
        </div>

        <div className="text-right ml-4">
          <div className="text-sm text-gray-600 mb-1">Identified Properties</div>
          <div className="text-3xl font-bold text-gray-900">{ruleStatus.identifiedCount}</div>
          
          {ruleStatus.totalIdentifiedValue > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-600">Total Value</div>
              <div className="text-lg font-semibold text-gray-900">
                ${ruleStatus.totalIdentifiedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {ruleStatus.totalSaleValue > 0 && ruleStatus.activeRule === '200_percent' && (
            <div className="mt-2">
              <div className="text-xs text-gray-600">Remaining Capacity</div>
              <div className="text-sm font-semibold text-gray-900">
                ${((ruleStatus.totalSaleValue * 2) - ruleStatus.totalIdentifiedValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Violations */}
      {ruleStatus.violations.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
          <div className="font-semibold text-red-900 mb-1">⚠️ Rule Violations:</div>
          <ul className="list-disc list-inside text-sm text-red-800">
            {ruleStatus.violations.map((violation, idx) => (
              <li key={idx}>{violation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {ruleStatus.warnings.length > 0 && !isWarning && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
          <div className="font-semibold text-yellow-900 mb-1">⚡ Warnings:</div>
          <ul className="list-disc list-inside text-sm text-yellow-800">
            {ruleStatus.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

