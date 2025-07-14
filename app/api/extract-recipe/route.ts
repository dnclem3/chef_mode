import { NextResponse } from 'next/server'
import type { ExtractionLog, ExtractedRecipe } from '@/lib/types'
import { spawn } from 'child_process'
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
    const pythonProcess = spawn('python3', [scriptPath, url])
    
    let outputData = ''
    let errorData = ''

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorData}`))
        return
      }

      try {
        const result = JSON.parse(outputData)
        if (!result.success) {
          reject(new Error(result.error))
          return
        }
        resolve(result.data)
      } catch (error) {
        reject(new Error('Failed to parse Python script output'))
      }
    })
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const userAgent = request.headers.get('user-agent')

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