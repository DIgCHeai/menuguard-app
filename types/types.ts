export type AnalysisStatus = 'pending' | 'completed' | 'failed';
export type AnalysisType = 'menu_analysis';
export interface AnalysisResult {
  itemName: string;
  safetyLevel: 'safe' | 'caution' | 'unsafe';
  reasoning: string;
  identifiedAllergens: string[];
}
export type AnalysisInputType = 'text' | 'image';