"use client"

import type { ExtractedRecipe, ExtractionStatus } from "@/lib/types"
import { useState, useEffect } from "react" // Import useEffect
import { useRouter } from "next/navigation"
import { ChefHat, Loader2, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { RecipeErrorModal } from "./recipe-error-modal"

interface RecipeExtractorProps {
  initialUrl?: string | null; // New prop for initial URL
}

export default function RecipeExtractor({ initialUrl }: RecipeExtractorProps) {
  const [url, setUrl] = useState("")
  const [status, setStatus] = useState<ExtractionStatus>("idle")
  const [error, setError] = useState("")
  const router = useRouter()
  const [showCamera, setShowCamera] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  // Effect to handle initialUrl prop
  useEffect(() => {
    if (initialUrl && status === "idle") {
      setUrl(initialUrl); // Set the URL state
      // Trigger extraction immediately if initialUrl is provided
      // Use a function to ensure it runs after state is set
      const trigger = async () => {
        await handleExtractInternal(initialUrl);
      };
      trigger();
    }
  }, [initialUrl, status]); // Re-run if initialUrl changes or status is idle

  const resetForm = () => {
    setUrl("")
    setStatus("idle")
    setError("")
    setSelectedImage(null)
    setShowCamera(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setError("")
      // Image upload not supported in MVP
      setStatus("error")
    }
  }

  const handleCameraCapture = () => {
    // Camera capture not supported in MVP
    setStatus("error")
  }

  // Internal function to handle extraction, callable by useEffect and form submit
  const handleExtractInternal = async (extractUrl: string) => {
    if (!extractUrl) {
      setError("Please enter a recipe URL")
      return
    }

    if (!extractUrl.startsWith("http")) {
      setError("Please enter a valid URL")
      return
    }

    setStatus("loading")
    setError("")

    try {
      // Your existing API call to the external Python service
      const response = await fetch(`/api/extract-recipe?url=${encodeURIComponent(extractUrl)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract recipe')
      }

      const recipe = data as ExtractedRecipe
      
      const recipeData = encodeURIComponent(JSON.stringify(recipe))
      router.push(`/cook/1?data=${recipeData}`)  // Using a placeholder ID of 1 for MVP
      
      setStatus("success")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : 'Failed to extract recipe')
    }
  }

  // Public handler for form submission
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleExtractInternal(url); // Use the current state 'url'
  }

  return (
    <>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleExtract} className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">Extract a recipe</h2>
              <p className="text-lg text-muted-foreground">
                Paste a URL or take a photo of any recipe and we'll transform it into a step-by-step cooking experience
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="url"
                  placeholder="https://example.com/recipe"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 text-lg py-3"
                  disabled={status === "loading"}
                />
                <Button 
                  type="submit" 
                  disabled={status === "loading"} 
                  className="text-lg px-6 py-3 bg-red-500"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    "Extract Recipe"
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-muted"></div>
                <span className="text-muted-foreground text-lg">or</span>
                <div className="flex-1 border-t border-muted"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                    id="image-upload"
                    disabled={status === "loading"}
                  />
                  <label htmlFor="image-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-lg py-3 cursor-pointer bg-white/80 backdrop-blur-sm border-2"
                      disabled={status === "loading"}
                      asChild
                    >
                      <div>
                        <Upload className="mr-2 h-5 w-5" />
                        Upload Photo
                      </div>
                    </Button>
                  </label>
                </div>

                <Button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={status === "loading"}
                  className="text-lg py-3 bg-white/80 backdrop-blur-sm border-2"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Take Photo
                </Button>
              </div>
            </div>

            {error && <p className="text-lg text-red-500">{error}</p>}

            {selectedImage && (
              <div className="text-lg text-emerald-600">Selected: {selectedImage.name}</div>
            )}

            {(status === "loading" || showCamera) && (
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <ChefHat className="h-10 w-10 text-emerald-600 animate-bounce" />
                  </div>
                  <p className="text-lg text-muted-foreground">
                    {showCamera ? "Chef is reading your recipe..." : "Chef is getting into the kitchen..."}
                  </p>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <RecipeErrorModal 
        isOpen={status === "error"} 
        onClose={resetForm} 
      />
    </>
  )
}
