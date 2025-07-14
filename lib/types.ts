export interface ExtractedRecipe {
  title: string;
  image: string | null;
  totalTime: number;
  yields: string;
  sourceUrl: string;
  prep: {
    ingredients: { item: string; quantity?: string }[];
  };
  cook: {
    steps: string[]; // each string is one instruction step
  };
}

export type ExtractionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ExtractionLog {
  stage: 'init' | 'fetch_start' | 'fetch_success' | 'fetch_failure';
  url: string;
  success: boolean;
  timestamp: string;
  errorMessage?: string;
} 