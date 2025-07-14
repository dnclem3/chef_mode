import { NextResponse } from 'next/server'
import type { ExtractionLog, ExtractedRecipe } from '@/lib/types'
import { PythonShell } from 'python-shell'
import path from 'path'

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

async function extractRecipe(url: string): Promise<ExtractedRecipe> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'recipe_extractor.py')
    
    const options = {
      mode: 'json' as const,
      // Try multiple Python paths
      pythonPath: process.env.VERCEL 
        ? process.env.PYTHON_PATH || '/var/lang/bin/python3'
        : 'python3',
      pythonOptions: ['-u'], // Unbuffered output
      args: [url]
    }

    console.log('Attempting Python script execution with options:', {
      scriptPath,
      pythonPath: options.pythonPath,
      isVercel: !!process.env.VERCEL
    });

    PythonShell.run(scriptPath, options).then((results) => {
      if (!results || results.length === 0) {
        console.error('No output from Python script');
        reject(new Error('No output from Python script'));
        return;
      }

      const result = results[0];
      if (!result.success) {
        console.error('Python script execution failed:', result.error);
        reject(new Error(result.error || 'Unknown error'));
        return;
      }
      resolve(result.data);
    }).catch((error) => {
      console.error('Python execution error:', error);
      reject(new Error(`Failed to run Python script: ${error.message}`));
    });
  });
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

    // Extract recipe data using Python script
    const recipeData = await extractRecipe(validatedUrl.toString())

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