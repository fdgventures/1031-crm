import { ExchangeRule, ExchangeRuleStatus, IdentifiedProperty } from "@/types/identified-property.types";

/**
 * Calculate which 1031 exchange rule applies based on identified properties
 */
export function calculateExchangeRule(
  identifiedProperties: IdentifiedProperty[],
  totalSalePropertyValue: number
): ExchangeRuleStatus {
  const violations: string[] = [];
  const warnings: string[] = [];
  
  const identifiedCount = identifiedProperties.length;
  const totalIdentifiedValue = identifiedProperties.reduce((sum, prop) => {
    const propertyValue = prop.value || 0;
    const improvementsValue = prop.improvements?.reduce((impSum, imp) => impSum + (imp.value || 0), 0) || 0;
    return sum + propertyValue + improvementsValue;
  }, 0);

  // No properties identified yet
  if (identifiedCount === 0) {
    return {
      activeRule: 'none',
      isCompliant: true,
      totalIdentifiedValue: 0,
      totalSaleValue: totalSalePropertyValue,
      identifiedCount: 0,
      violations: [],
      warnings: []
    };
  }

  // Check 3 Property Rule first
  if (identifiedCount <= 3) {
    return {
      activeRule: '3_property',
      isCompliant: true,
      totalIdentifiedValue,
      totalSaleValue: totalSalePropertyValue,
      identifiedCount,
      violations: [],
      warnings: identifiedCount === 3 
        ? ["You have reached the maximum of 3 properties. Adding more will require the 200% rule."]
        : []
    };
  }

  // Check 200% Rule
  const maxAllowedValue = totalSalePropertyValue * 2;
  if (totalIdentifiedValue <= maxAllowedValue) {
    const remainingCapacity = maxAllowedValue - totalIdentifiedValue;
    const percentUsed = (totalIdentifiedValue / maxAllowedValue) * 100;

    if (percentUsed >= 90) {
      warnings.push(`You have used ${percentUsed.toFixed(1)}% of your 200% limit. Only $${remainingCapacity.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining.`);
    }

    return {
      activeRule: '200_percent',
      isCompliant: true,
      totalIdentifiedValue,
      totalSaleValue: totalSalePropertyValue,
      identifiedCount,
      violations: [],
      warnings
    };
  }

  // 95% Rule applies when 200% is exceeded
  const requiredAcquisitionValue = totalIdentifiedValue * 0.95;
  violations.push(`Total identified value ($${totalIdentifiedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds 200% of sale value ($${maxAllowedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })})`);
  violations.push(`You must acquire at least 95% ($${requiredAcquisitionValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}) of all identified properties`);

  return {
    activeRule: '95_percent',
    isCompliant: false,
    totalIdentifiedValue,
    totalSaleValue: totalSalePropertyValue,
    identifiedCount,
    violations,
    warnings: ["The 95% rule is very restrictive. Consider reducing identified properties to comply with the 200% rule."]
  };
}

/**
 * Check if adding a new property would violate rules
 */
export function canAddProperty(
  currentProperties: IdentifiedProperty[],
  newPropertyValue: number,
  totalSalePropertyValue: number
): { canAdd: boolean; reason?: string } {
  const currentCount = currentProperties.length;
  const currentTotalValue = currentProperties.reduce((sum, prop) => {
    const propertyValue = prop.value || 0;
    const improvementsValue = prop.improvements?.reduce((impSum, imp) => impSum + (imp.value || 0), 0) || 0;
    return sum + propertyValue + improvementsValue;
  }, 0);

  // If we're at 3 properties, warn about moving to 200% rule
  if (currentCount === 3) {
    const newTotalValue = currentTotalValue + newPropertyValue;
    const maxAllowed = totalSalePropertyValue * 2;
    
    if (newTotalValue > maxAllowed) {
      return {
        canAdd: false,
        reason: `Adding this property would exceed the 200% rule limit of $${maxAllowed.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      };
    }
    
    return {
      canAdd: true,
      reason: "Adding 4th property will activate the 200% rule"
    };
  }

  // If already using 200% rule
  if (currentCount > 3) {
    const newTotalValue = currentTotalValue + newPropertyValue;
    const maxAllowed = totalSalePropertyValue * 2;
    
    if (newTotalValue > maxAllowed) {
      return {
        canAdd: false,
        reason: `Adding this property would exceed the 200% rule limit. This would trigger the restrictive 95% rule.`
      };
    }
  }

  return { canAdd: true };
}

