export interface ExtractedRecipe {
  title: string;
  image: string | null;
  totalTime: number;
  yields: string;
  sourceUrl: string;
  ingredients: string[];
  instructions: string[];
  step_ingredients?: {
    [key: string]: string[] // Keep as optional for API compatibility
  };
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