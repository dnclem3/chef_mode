import { NextResponse } from 'next/server'
import type { ExtractionLog, ExtractedRecipe } from '@/lib/types'
import OpenAI from 'openai';

// Helper function to log extraction events
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
    console.log('Number of Ingredients:', logEntry.recipeData.ingredients.length)
    console.log('Number of Steps:', logEntry.recipeData.instructions.length)
    if (logEntry.recipeData.step_ingredients) {
      console.log('Step Ingredients:', logEntry.recipeData.step_ingredients);
    }
  }
  console.log('===========================\n')
}

// ✅ UPDATED FUNCTION FOR MULTIPLE IMAGE SUPPORT WITH OPENAI
async function extractRecipeFromImage(imageData: string[], userAgent?: string): Promise<ExtractedRecipe> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  });

  const systemPrompt = `You are a recipe extraction assistant. Extract recipe information from images and return it in JSON format.
Always return valid JSON with no additional text or markdown formatting.
If multiple images are provided, combine all visible information into a single recipe.`;

  const userPrompt = `Extract the complete recipe information from the provided image(s). Return only a JSON object with this exact structure:
{
  "title": "string",
  "image": null,
  "totalTime": number,
  "yields": "string",
  "sourceUrl": "string",
  "ingredients": ["string"],
  "instructions": ["string"],
  "step_ingredients": { "[step_index: number]": ["string"] }
}

For ingredients, include quantity and item in each string.
For instructions, provide clear step-by-step directions.
The step_ingredients should map step index (0-based) to ingredients used in that step.
If any information is not visible, use null for strings, 0 for numbers, or empty arrays.`;

  try {
    // Debug: Log detailed information about each image
    console.log('\n=== DETAILED IMAGE ANALYSIS ===');
    console.log('Total images received:', imageData.length);
    
    imageData.forEach((data, index) => {
      console.log(`\nImage ${index + 1}:`);
      console.log('Data URL prefix:', data.substring(0, 100));
      console.log('Total length:', data.length);
      
      // Extract MIME type and encoding
      const mimeMatch = data.match(/^data:([^;]+);(.+),/);
      if (mimeMatch) {
        console.log('MIME type:', mimeMatch[1]);
        console.log('Encoding:', mimeMatch[2]);
        
        // Check if it's base64
        if (mimeMatch[2] === 'base64') {
          const base64Part = data.split(',')[1];
          console.log('Base64 length:', base64Part.length);
          console.log('Base64 preview:', base64Part.substring(0, 50) + '...');
          
          // Validate base64
          try {
            atob(base64Part.substring(0, 100)); // Test a small portion
            console.log('Base64 validation: VALID');
          } catch (e) {
            console.log('Base64 validation: INVALID', e);
          }
        } else {
          console.log('WARNING: Not base64 encoded!');
        }
      } else {
        console.log('WARNING: Invalid data URL format!');
      }
    });

    // Format images for OpenAI
    const formattedImages = imageData.map((data, index) => {
      // Validate data URL format before sending to OpenAI
      if (!data.startsWith('data:image/')) {
        console.error(`Image ${index + 1}: Invalid data URL format`);
        throw new Error(`Image ${index + 1} has invalid format`);
      }
      
      return {
        type: "image_url" as const,
        image_url: {
          url: data, // OpenAI accepts base64 images with data URL format
        }
      };
    });

    console.log('\nSending request to OpenAI...');
    console.log('Number of valid images:', formattedImages.length);

    // Log the exact request structure
    console.log('Request structure:');
    console.log('Number of images being sent:', formattedImages.length);
    console.log('Text prompt length:', userPrompt.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            ...formattedImages
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const recipeData = completion.choices[0]?.message?.content;
    
    if (!recipeData) {
      throw new Error("No response from OpenAI");
    }

    console.log('OpenAI response:', recipeData);
    
    const parsedData = JSON.parse(recipeData) as ExtractedRecipe;
    
    if (!parsedData || !parsedData.title || !Array.isArray(parsedData.instructions)) {
      throw new Error("OpenAI response missing title or instructions.");
    }

    console.log('Successfully parsed and validated OpenAI recipe');
    return parsedData;
  } catch (err) {
    console.error('OpenAI extraction error:', err);
    throw new Error(`OpenAI image extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Function to extract recipe from a URL using an external service
async function extractRecipeFromUrl(url: string, userAgent?: string): Promise<ExtractedRecipe> {
  const extractorBaseUrl = process.env.RECIPE_EXTRACTOR_BASE_URL;
  const extractorApiKey = process.env.RECIPE_EXTRACTOR_API_KEY;

  if (!extractorBaseUrl || !extractorApiKey) {
    throw new Error("Recipe extractor service URL or API key is not configured.");
  }

  const externalApiUrl = `${extractorBaseUrl}/extract?url=${encodeURIComponent(url)}`;

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

// GET handler for URL-based recipe extraction
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

// POST handler for image-based recipe extraction
export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') || undefined
  let imageData: string[] = [];
  
  try {
    const body = await request.json();
    if (body.images && Array.isArray(body.images)) {
      imageData = body.images;
    } else {
      throw new Error("Invalid request body: 'images' array is missing or malformed.");
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
    url: `Image extraction request received (${imageData.length} images)`,
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