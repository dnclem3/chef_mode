"use client"

import Link from "next/link"
import { ChefHat, ArrowRight, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import RecipeExtractor from "@/components/recipe-extractor"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react" // Import Suspense

// A client component that uses useSearchParams
function RecipeExtractorWrapper() {
  const searchParams = useSearchParams()
  const [initialUrlToExtract, setInitialUrlToExtract] = useState<string | null>(null)
  const [extractionTriggered, setExtractionTriggered] = useState(false);

  useEffect(() => {
    const urlParam = searchParams.get('url')
    if (urlParam && !extractionTriggered) {
      setInitialUrlToExtract(decodeURIComponent(urlParam));
      setExtractionTriggered(true);
    }
  }, [searchParams, extractionTriggered])

  return <RecipeExtractor initialUrl={initialUrlToExtract} />;
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-red-500" />
          <span className="font-semibold text-xl">Chef Mode</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">Cook with focus, one step at a time</h1>
        <p className="text-lg text-center text-muted-foreground mb-12 max-w-2xl">
          Chef Mode transforms any recipe into a distraction-free, step-by-step cooking experience designed to reduce
          cognitive load.
        </p>

        <div className="w-full mb-12">
          {/* Wrap the RecipeExtractorWrapper in a Suspense boundary */}
          <Suspense fallback={<div>Loading recipe extractor...</div>}>
            <RecipeExtractorWrapper />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-12">
          <div className="flex flex-col items-center text-center p-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-muted-foreground text-white">
              <span className="font-semibold text-white">1</span>
            </div>
            <h3 className="font-medium text-lg mb-2">Paste a recipe URL</h3>
            <p className="text-muted-foreground">We'll extract the recipe and transform it into a focused experience</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-muted-foreground text-white">
              <span className="font-semibold text-white">2</span>
            </div>
            <h3 className="font-medium text-lg mb-2">Follow step by step</h3>
            <p className="text-muted-foreground">See one step at a time with ingredients when you need them</p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-6 w-full">
          <h2 className="font-semibold text-xl mb-4">Why Chef Mode?</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 mt-0.5 flex-shrink-0 text-black" />
              <span>No more scrolling between ingredients and instructions</span>
            </li>
            <li className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 mt-0.5 flex-shrink-0 text-black" />
              <span>Prep ingredients in logical groups before cooking</span>
            </li>
            <li className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 mt-0.5 flex-shrink-0 text-black" />
              <span>Large, readable text that's visible from across the kitchen</span>
            </li>
          </ul>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Chef Mode</span>
          </div>
          <a href="https://github.com" className="text-muted-foreground hover:text-foreground flex items-center gap-2">
            <Github className="h-5 w-5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  )
}