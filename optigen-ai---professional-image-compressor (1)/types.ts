
export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  status: 'idle' | 'analyzing' | 'optimizing' | 'completed' | 'error';
  result?: CompressionResult;
  analysis?: AIAnalysis;
  useSmartCrop?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  url: string;
  size: number;
  quality: number;
  reduction: number;
  width: number;
  height: number;
  format: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIAnalysis {
  description: string;
  recommendedQuality: number;
  focusAreas: string[];
  suggestedFormat: 'webp' | 'jpeg' | 'png' | 'avif';
  complexityScore: number;
  savingsEstimate: string;
  smartCropSuggestion?: CropArea;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}
