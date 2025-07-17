import { NextResponse } from 'next/server'
import type { ExtractionLog, ExtractedRecipe } from '@/lib/types'
import { GoogleGenerativeAI } from "@google/generative-ai";

function logExtraction(log: ExtractionLog) {
  const timestamp = log.timestamp || new Date().toISOString()
  const logEntry = {
    ...log,
    timestamp,
    environment: process.env.NODE_ENV,
    userAgent: log.userAgent || 'Not provided',
  }

  console.log('\n=== Recipe Extraction Log ===')
  console.log('Timestamp:', logEntry.timestamp)
  console.log('Stage:', logEntry.stage)
  console.log('URL:', logEntry.url) // This might be "Image extraction request received" for image uploads
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
    console.log('Number of Ingredients:', logEntry.recipeData.ingredients.length)
    console.log('Number of Steps:', logEntry.recipeData.instructions.length)
    if (logEntry.recipeData.step_ingredients) {
      console.log('Step Ingredients:', logEntry.recipeData.step_ingredients);
    }
  }
  console.log('===========================\n')
}

async function extractRecipeFromUrl(url: string, userAgent?: string): Promise<ExtractedRecipe> {
  const extractorBaseUrl = process.env.RECIPE_EXTRACTOR_BASE_URL;
  const extractorApiKey = process.env.RECIPE_EXTRACTOR_API_KEY;

  if (!extractorBaseUrl || !extractorApiKey) {
    throw new Error("Recipe extractor service URL or API key is not configured.");
  }

  const externalApiUrl = `${extractorBaseUrl}/extract?url=${encodeURIComponent(url)}`;
  
  console.log('Attempting to call external recipe extraction service (URL):', externalApiUrl);

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

async function extractRecipeFromImage(imageData: string[], userAgent?: string): Promise<ExtractedRecipe> {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  // Initialize the Gemini API client
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  console.log('Initializing Gemini with model: gemini-2.5-flash');
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Prepare the prompt for recipe extraction
  const prompt = "Extract the recipe information from this input. Return a JSON object with exactly this structure: { \"title\": \"string\", \"image\": null, \"totalTime\": number, \"yields\": \"string\", \"sourceUrl\": \"string\", \"ingredients\": [\"string\"], \"instructions\": [\"string\"], \"step_ingredients\": { \"[step_index: number]\": [\"string\"] } }. For ingredients, include quantity and item in each string. For instructions, provide clear step-by-step directions. The step_ingredients should map step index (0-based) to ingredients used in that step. If any information is not visible, use null or empty arrays as appropriate.";

  try {
    // Process each input and create parts array
    console.log('Processing input data...');
    const parts = await Promise.all(imageData.map(async (data, index) => {
      console.log(`Processing input ${index + 1}/${imageData.length}`);
      
      // Check if it's base64 image data
      if (data.startsWith('data:image/')) {
        console.log('Processing as image data');
        const base64Content = data.includes('base64,') ? data.split('base64,')[1] : data;
        const mimeType = data.split(';')[0].split(':')[1] || "image/jpeg";
        
        return {
          inlineData: {
            data: base64Content,
            mimeType: mimeType
          }
        };
      } else {
        // Handle as text data
        console.log('Processing as text data');
        return {
          text: data
        };
      }
    }));

    // Generate content with the model
    console.log('Calling Gemini API...');
    const result = await model.generateContent([prompt, ...parts]);
    console.log('Received response from Gemini');
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Gemini response:', text);

    // Extract JSON from the response
    let jsonStr = text;
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
      console.log('Found JSON in code block');
      jsonStr = jsonMatch[1].trim();
    } else if (!text.trim().startsWith('{')) {
      console.log('Looking for JSON in text');
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = text.substring(firstBrace, lastBrace + 1);
      }
    }

    console.log('Attempting to parse JSON:', jsonStr);
    const recipeData = JSON.parse(jsonStr) as ExtractedRecipe;

    // Validate the parsed data
    if (!recipeData || typeof recipeData.title !== 'string' || !Array.isArray(recipeData.instructions)) {
      throw new Error("Invalid recipe structure in response");
    }

    return recipeData;
  } catch (error) {
    console.error('Detailed error in extractRecipeFromImage:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to process with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

  const timestamp = new Date().toISOString()
  logExtraction({
    stage: 'init',
    url,
    success: false,
    timestamp,
    userAgent
  })

  try {
    const validatedUrl = new URL(url)
    logExtraction({
      stage: 'fetch_start',
      url: validatedUrl.toString(),
      success: false,
      timestamp,
      userAgent
    })

    const recipeData = await extractRecipeFromUrl(validatedUrl.toString(), userAgent)

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

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') || undefined
  let imageData: string[] = [];
  
  try {
    const body = await request.json();
    if (body.images && Array.isArray(body.images)) {
      imageData = body.images;
    } else {
      throw new Error("Invalid image data provided in request body.");
    }
  } catch (error) {
    logExtraction({
      stage: 'init',
      url: 'Image data parse error',
      success: false,
      timestamp: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Invalid request body for image extraction',
      userAgent
    })
    return NextResponse.json({ error: 'Invalid request body for image extraction' }, { status: 400 })
  }

  if (imageData.length === 0) {
    logExtraction({
      stage: 'init',
      url: 'No image data provided',
      success: false,
      timestamp: new Date().toISOString(),
      errorMessage: 'No image data provided',
      userAgent
    })
    return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
  }

  const timestamp = new Date().toISOString()
  logExtraction({
    stage: 'init',
    url: 'Image extraction request received',
    success: false,
    timestamp,
    userAgent
  })

  try {
    const recipeData = await extractRecipeFromImage(imageData, userAgent)

    logExtraction({
      stage: 'fetch_success',
      url: 'Image extraction successful',
      success: true,
      timestamp,
      userAgent,
      recipeData
    })

    return NextResponse.json(recipeData)
  } catch (error) {
    logExtraction({
      stage: 'fetch_failure',
      url: 'Image extraction failed',
      success: false,
      timestamp,
      userAgent,
      errorMessage: error instanceof Error ? error.message : 'Unknown error during image extraction'
    })

    return NextResponse.json(
      { error: 'Failed to extract recipe from image' },
      { status: 500 }
    )
  }
}