"use client"

import type { ExtractedRecipe, ExtractionStatus } from "@/lib/types"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChefHat, Loader2, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { RecipeErrorModal } from "./recipe-error-modal"

interface RecipeExtractorProps {
  initialUrl?: string | null;
}

export default function RecipeExtractor({ initialUrl }: RecipeExtractorProps) {
  const [url, setUrl] = useState("")
  const [status, setStatus] = useState<ExtractionStatus>("idle")
  const [error, setError] = useState("")
  const router = useRouter()
  const [selectedImages, setSelectedImages] = useState<File[]>([]) // State to store selected image files
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input element

  // Effect to handle initialUrl prop for automatic URL extraction
  useEffect(() => {
    if (initialUrl && status === "idle") {
      setUrl(initialUrl);
      const trigger = async () => {
        await handleExtractInternal(initialUrl, 'url');
      };
      trigger();
    }
  }, [initialUrl, status]);

  const resetForm = () => {
    setUrl("")
    setStatus("idle")
    setError("")
    setSelectedImages([]) // Clear selected images
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input's value
    }
  }

  // Handle image file selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newImages = Array.from(files);
      if (newImages.length > 2) {
        setError("You can only upload a maximum of 2 photos.");
        setSelectedImages([]); // Clear any previously selected images if validation fails
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      } else {
        setSelectedImages(newImages);
        setError("");
        setUrl(""); // Clear URL input if images are selected
      }
    } else {
      setSelectedImages([]); // No files selected, clear state
    }
  }

  // Helper function to convert File object to Base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Internal function to handle extraction logic, generalized for URL and image
  const handleExtractInternal = async (data: string | File[], sourceType: 'url' | 'image') => {
    setStatus("loading")
    setError("")

    let requestBody: any;
    let endpoint: string;
    let method: string;
    let contentType: string | undefined = undefined;

    if (sourceType === 'url') {
      if (typeof data !== 'string' || !data) {
        setError("Please enter a recipe URL");
        setStatus("idle");
        return;
      }
      if (!data.startsWith("http")) {
        setError("Please enter a valid URL");
        setStatus("idle");
        return;
      }
      endpoint = `/api/extract-recipe?url=${encodeURIComponent(data)}`;
      method = 'GET';
    } else { // sourceType === 'image'
      if (!Array.isArray(data) || data.length === 0) {
        setError("Please select at least one image.");
        setStatus("idle");
        return;
      }
      if (data.length > 2) { // Double check for good measure
        setError("You can only upload a maximum of 2 photos.");
        setStatus("idle");
        return;
      }

      // Convert image files to base64 strings for sending to the backend
      const base64Images = await Promise.all(data.map(fileToBase64));

      endpoint = `/api/extract-recipe`; // POST to the same route
      method = 'POST';
      requestBody = JSON.stringify({ images: base64Images }); // Send as JSON with images array
      contentType = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': contentType,
        } as HeadersInit, // Type assertion for HeadersInit
        body: requestBody,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract recipe');
      }

      const recipe = result as ExtractedRecipe;
      const recipeData = encodeURIComponent(JSON.stringify(recipe))
      router.push(`/cook/1?data=${recipeData}`) // Route to cook page with recipe data
      
      setStatus("success")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : 'Failed to extract recipe')
    }
  }

  // Handler for URL form submission
  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    setSelectedImages([]); // Clear images if URL is submitted
    if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
    await handleExtractInternal(url, 'url');
  }

  // Handler for image extraction button click
  const handleExtractImage = async () => {
    await handleExtractInternal(selectedImages, 'image');
  }

  return (
    <>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleExtractUrl} className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">Extract a recipe</h2>
              <p className="text-lg text-muted-foreground">
                Paste a URL or upload a photo of any recipe and we'll transform it into a step-by-step cooking experience
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="url"
                  placeholder="https://example.com/recipe"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setSelectedImages([]); // Clear images if URL input changes
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-1 text-lg py-3"
                  disabled={status === "loading"}
                />
                <Button 
                  type="submit" 
                  disabled={status === "loading" || selectedImages.length > 0} // Disable if images are selected
                  className="text-lg px-6 py-3 bg-red-500"
                >
                  {status === "loading" && url ? ( // Show loading for URL only if URL is active
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    "Extract from URL"
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
                    multiple // Allow multiple file selection
                    ref={fileInputRef} // Attach ref to clear input
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
                        Upload Photo(s)
                      </div>
                    </Button>
                  </label>
                </div>

                {/* "Take Photo" button can now directly trigger the file input, which on mobile often presents camera option */}
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()} // Trigger the hidden file input
                  disabled={status === "loading"}
                  className="text-lg py-3 bg-white/80 backdrop-blur-sm border-2"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Take Photo(s)
                </Button>
              </div>

              {selectedImages.length > 0 && (
                <div className="flex flex-col space-y-2">
                  <p className="text-lg text-gray-700">Selected files: {selectedImages.map(file => file.name).join(', ')}</p>
                  <Button
                    onClick={handleExtractImage}
                    disabled={status === "loading"}
                    className="text-lg px-6 py-3 bg-red-500"
                  >
                    {status === "loading" && selectedImages.length > 0 ? ( // Show loading for images only if images are active
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Extracting Photo(s)...
                      </>
                    ) : (
                      "Extract from Photo(s)"
                    )}
                  </Button>
                </div>
              )}
            </div>

            {error && <p className="text-lg text-red-500">{error}</p>}

            {(status === "loading") && ( // Unified loading message for both types of extraction
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <ChefHat className="h-10 w-10 text-emerald-600 animate-bounce" />
                  </div>
                  <p className="text-lg text-muted-foreground">
                    Chef is getting into the kitchen...
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