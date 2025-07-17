import fs from 'fs';
import path from 'path';

async function testRecipeExtraction() {
  try {
    // Read the test recipe text
    const recipePath = path.join(process.cwd(), 'scripts', 'test-recipe.txt');
    const recipeText = fs.readFileSync(recipePath, 'utf-8');

    // Create a data URL from the recipe text
    const base64Text = Buffer.from(recipeText).toString('base64');
    const dataUrl = `data:text/plain;base64,${base64Text}`;

    console.log('Making request to extract recipe...');
    console.log('Recipe text:', recipeText);

    // Make the POST request to the endpoint
    const response = await fetch('http://localhost:3000/api/extract-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [dataUrl]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

// First make sure the development server is running
console.log('Starting test...');
console.log('Make sure your development server is running (npm run dev)');
console.log('And GEMINI_API_KEY is set in your environment');

testRecipeExtraction(); 