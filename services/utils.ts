import { AnalysisResult, SafetyLevel } from '../types';

/**
 * A type guard that performs runtime validation to check if 'data'
 * is an array of objects that conform to the AnalysisResult interface.
 * This is crucial for safely handling data from a JSONB column.
 *
 * @param data The unknown data to check, likely from a Supabase JSONB column.
 * @returns True if the data is a valid AnalysisResult[], false otherwise.
 */
export function isAnalysisResultArray(data: unknown): data is AnalysisResult[] {
  if (!Array.isArray(data)) {
    return false;
  }

  // Check if every item in the array is a valid AnalysisResult object.
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'itemName' in item &&
    typeof item.itemName === 'string' &&
    'safetyLevel' in item &&
    Object.values(SafetyLevel).includes(item.safetyLevel as SafetyLevel) &&
    'reasoning' in item &&
    typeof item.reasoning === 'string' &&
    'identifiedAllergens' in item &&
    Array.isArray(item.identifiedAllergens) &&
    item.identifiedAllergens.every((allergen: unknown) => typeof allergen === 'string')
  );
}
