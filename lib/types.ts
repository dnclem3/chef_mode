export interface ExtractedRecipe {
  title: string;
  image: string | null;
  totalTime: number;
  yields: string;
  sourceUrl: string;
  prep: {
    ingredients: { item: string; quantity: string | null }[];
  };
  cook: {
    steps: string[]; // each string is one instruction step
  };
  step_ingredients?: { [key: number]: string[] } | null; // NEW FIELD: Optional, object mapping step index to array of ingredients
}

export type ExtractionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ExtractionLog {
  stage: 'init' | 'fetch_start' | 'fetch_success' | 'fetch_failure';
  url: string;
  success: boolean;
  timestamp: string;
  errorMessage?: string;
  userAgent?: string;
  recipeData?: ExtractedRecipe;
  environment?: 'development' | 'production' | 'test';
}