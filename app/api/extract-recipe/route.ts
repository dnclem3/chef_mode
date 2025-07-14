import { NextResponse } from 'next/server'
import type { ExtractionLog, ExtractedRecipe } from '@/lib/types'
// Remove PythonShell import: import { PythonShell } from 'python-shell'
// Remove path import: import path from 'path'

function logExtraction(log: ExtractionLog) {
  // Add timestamp if not provided
  const timestamp = log.timestamp || new Date().toISOString()
  
  // Format the log entry
  const logEntry = {
    ...log,
    timestamp,
    environment: process.env.NODE_ENV,
    userAgent: log.userAgent || 'Not provided',
  }

  // For MVP, log to console in a structured way
  console.log('\n=== Recipe Extraction Log ===')
  console.log('Timestamp:', logEntry.timestamp)
  console.log('Stage:', logEntry.stage)
  console.log('URL:', logEntry.url)
  console.log('Success:', logEntry.success)
  console.log('Environment:', logEntry.environment)
  console.log('User Agent:', logEntry.userAgent)
  if (logEntry.errorMessage) {
    console.log('Error:', logEntry.errorMessage)
  }
  if (logEntry.recipeData) {
    console.log('\nExtracted Recipe Data:')
    console.log('Title:', logEntry.recipeData.title)
    console.log('Total Time:', logEntry.recipeData.totalTime, 'minutes')
    console.log('Yields:', logEntry.recipeData.yields)
    console.log('Number of Ingredients:', logEntry.recipeData.prep.ingredients.length)
    console.log('Number of Steps:', logEntry.recipeData.cook.steps.length)
  }
  console.log('===========================\n')
}

// This function now calls the external Vercel service
async function extractRecipe(url: string, userAgent?: string): Promise<ExtractedRecipe> {
  const extractorBaseUrl = process.env.RECIPE_EXTRACTOR_BASE_URL;
  const extractorApiKey = process.env.RECIPE_EXTRACTOR_API_KEY;

  if (!extractorBaseUrl || !extractorApiKey) {
    throw new Error("Recipe extractor service URL or API key is not configured.");
  }

  const externalApiUrl = `${extractorBaseUrl}/extract?url=${encodeURIComponent(url)}`;
  
  console.log('Attempting to call external recipe extraction service:', externalApiUrl);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': extractorApiKey,
  };

  if (userAgent) {
    headers['User-Agent'] = userAgent;
  }

  const response = await fetch(externalApiUrl, {
    method: 'GET',
    headers: headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `External service failed with status: ${response.status}`);
  }

  return response.json() as Promise<ExtractedRecipe>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const userAgent = request.headers.get('user-agent') || undefined

  if (!url) {
    logExtraction({
      stage: 'init',
      url: 'No URL provided',
      success: false,
      timestamp: new Date().toISOString(),
      errorMessage: 'URL is required',
      userAgent
    })
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Log initial attempt
  const timestamp = new Date().toISOString()
  logExtraction({
    stage: 'init',
    url,
    success: false,
    timestamp,
    userAgent
  })

  try {
    // Validate URL
    const validatedUrl = new URL(url)

    // Log fetch start
    logExtraction({
      stage: 'fetch_start',
      url: validatedUrl.toString(),
      success: false,
      timestamp,
      userAgent
    })

    // Extract recipe data using Python script (now via external service)
    const recipeData = await extractRecipe(validatedUrl.toString(), userAgent)

    // Log success with recipe data
    logExtraction({
      stage: 'fetch_success',
      url: validatedUrl.toString(),
      success: true,
      timestamp,
      userAgent,
      recipeData
    })

    return NextResponse.json(recipeData)
  } catch (error) {
    // Log failure with detailed error
    logExtraction({
      stage: 'fetch_failure',
      url,
      success: false,
      timestamp,
      userAgent,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Failed to extract recipe' },
      { status: 500 }
    )
  }
}