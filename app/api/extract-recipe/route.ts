import { NextResponse } from 'next/server'
import type { ExtractionLog } from '@/lib/types'

// For MVP, we'll use a mock recipe
const MOCK_RECIPE = {
  title: "Classic Chocolate Chip Cookies",
  image: null,
  totalTime: 45,
  yields: "24 cookies",
  sourceUrl: "https://example.com/cookies",
  prep: {
    ingredients: [
      { item: "all-purpose flour", quantity: "2 1/4 cups" },
      { item: "baking soda", quantity: "1 tsp" },
      { item: "salt", quantity: "1 tsp" },
      { item: "butter, softened", quantity: "1 cup" },
      { item: "granulated sugar", quantity: "3/4 cup" },
      { item: "brown sugar", quantity: "3/4 cup" },
      { item: "vanilla extract", quantity: "1 tsp" },
      { item: "large eggs", quantity: "2" },
      { item: "chocolate chips", quantity: "2 cups" }
    ]
  },
  cook: {
    steps: [
      "Preheat oven to 375°F (190°C)",
      "In a bowl, whisk together flour, baking soda, and salt",
      "In a large bowl, beat butter and sugars until creamy",
      "Beat in eggs one at a time, then stir in vanilla",
      "Gradually blend in dry ingredients",
      "Stir in chocolate chips",
      "Drop rounded tablespoons onto ungreased baking sheets",
      "Bake for 9 to 11 minutes or until golden brown"
    ]
  }
}

function logExtraction(log: ExtractionLog) {
  // For MVP, just console log the attempt
  console.log('Recipe extraction attempt:', log)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Log initial attempt
  const timestamp = new Date().toISOString()
  logExtraction({
    stage: 'init',
    url,
    success: false,
    timestamp
  })

  try {
    // Validate URL
    new URL(url)

    // Log fetch start
    logExtraction({
      stage: 'fetch_start',
      url,
      success: false,
      timestamp
    })

    // For MVP, return mock data after a delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Log success
    logExtraction({
      stage: 'fetch_success',
      url,
      success: true,
      timestamp
    })

    return NextResponse.json(MOCK_RECIPE)
  } catch (error) {
    // Log failure
    logExtraction({
      stage: 'fetch_failure',
      url,
      success: false,
      timestamp,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Failed to extract recipe' },
      { status: 500 }
    )
  }
} 