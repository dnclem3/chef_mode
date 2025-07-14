"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import PrepBowl from "@/components/prep-bowl"
import { useMobile } from "@/hooks/use-mobile"
import type { ExtractedRecipe } from "@/lib/types"

export default function CookPage() {
  // 1. All navigation/routing hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  
  // 2. All custom hooks
  const isMobile = useMobile()
  
  // 3. All useState hooks
  const [recipe, setRecipe] = useState<ExtractedRecipe | null>(null)
  const [phase, setPhase] = useState<"prep" | "cook">("prep")
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // 4. Recipe data effect
  useEffect(() => {
    const data = searchParams.get('data')
    if (data) {
      try {
        const recipeData = JSON.parse(decodeURIComponent(data)) as ExtractedRecipe
        setRecipe(recipeData)
      } catch (error) {
        console.error('Failed to parse recipe data:', error)
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [searchParams, router])

  // 5. Mobile swipe effect
  useEffect(() => {
    if (!isMobile) return

    let touchStartX = 0
    let touchEndX = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      handleSwipe()
    }

    const handleSwipe = () => {
      const swipeThreshold = 50
      if (touchEndX - touchStartX > swipeThreshold) {
        // Swipe right
        handlePrevious()
      } else if (touchStartX - touchEndX > swipeThreshold) {
        // Swipe left
        handleNext()
      }
    }

    document.addEventListener("touchstart", handleTouchStart, false)
    document.addEventListener("touchend", handleTouchEnd, false)

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isMobile])

  // Early return if no recipe
  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading recipe...</h2>
          <p className="text-muted-foreground">Please wait while we prepare your recipe.</p>
        </div>
      </div>
    )
  }

  // Computed values
  const isPrepPhase = phase === "prep"
  const prepSteps = 1
  const cookSteps = recipe.cook.steps.length
  const totalSteps = prepSteps + cookSteps
  const completedSteps = isPrepPhase ? 0 : prepSteps + currentStepIndex
  const progress = (completedSteps / totalSteps) * 100

  // Event handlers
  const handleNext = () => {
    if (isPrepPhase) {
      setPhase("cook")
      setCurrentStepIndex(0)
    } else if (currentStepIndex < cookSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (isPrepPhase) {
      return // No previous in prep
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    } else {
      setPhase("prep")
    }
  }

  // Rest of the component remains the same...
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg">Exit</span>
          </Link>
          <h1 className="font-medium text-xl">{recipe.title}</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3 bg-white/60 backdrop-blur-sm">
        <div className="flex justify-between items-center text-lg text-muted-foreground mb-2">
          <div className="font-medium">
            {isPrepPhase ? "Preparation" : "Cooking"} - Step {isPrepPhase ? 1 : currentStepIndex + 1} of {isPrepPhase ? 1 : cookSteps}
          </div>
          <div>
            {completedSteps} of {totalSteps} total steps
          </div>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-8">
            {isPrepPhase ? (
              <>
                <h2 className="text-4xl font-bold mb-6 text-gray-800">Prepare Ingredients</h2>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-orange-200">
                  <ul className="space-y-3">
                    {recipe.prep.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                        <span className="text-xl text-gray-700">
                          {ingredient.quantity && <span className="font-medium">{ingredient.quantity}</span>} {ingredient.item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold mb-6 text-gray-800">Step {currentStepIndex + 1}</h2>
                <p className="text-2xl leading-relaxed mb-8 text-gray-700 font-medium">
                  {recipe.cook.steps[currentStepIndex]}
                </p>
              </>
            )}
          </div>

          <div className="mt-auto flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isPrepPhase}
              className="flex items-center gap-2 text-xl px-8 py-4 h-auto bg-white/80 backdrop-blur-sm border-2"
            >
              <ChevronLeft className="h-6 w-6" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={phase === "cook" && currentStepIndex === cookSteps - 1}
              className="flex items-center gap-2 text-xl px-8 py-4 h-auto"
            >
              Next
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
