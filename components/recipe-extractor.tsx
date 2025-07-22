"use client"

import type { ExtractedRecipe, ExtractionStatus } from "@/lib/types"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image" // Import Image component for displaying thumbnails
import { ChefHat, Loader2, Camera, Upload, XCircle } from "lucide-react" // Added XCircle for removing images
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
  // Changed selectedImage to selectedImages to store an array of File objects
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null) // Ref for the hidden file input

  // Effect to handle initialUrl prop
  useEffect(() => {
    if (initialUrl && status === "idle") {
      setUrl(initialUrl);
      const trigger = async () => {
        await handleExtractInternal(initialUrl);
      };
      trigger();
    }
  }, [initialUrl, status]);

  // Resets the form state, including clearing selected images
  const resetForm = () => {
    setUrl("")
    setStatus("idle")
    setError("")
    setSelectedImages([]) // Clear all selected images
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input as well
    }
  }

  // Handles image file selection, allowing multiple files up to 3
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== IMAGE UPLOAD HANDLER CALLED ===');
    
    const files = e.target.files
    console.log('Files from input:', files ? files.length : 'null');
    
    if (files) {
      console.log('Raw files:', Array.from(files).map((file, i) => `${i + 1}: ${file.name} (${file.type}, ${file.size} bytes)`));
      
      const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      console.log('Filtered image files:', newFiles.length);
      console.log('Image files:', newFiles.map((file, i) => `${i + 1}: ${file.name} (${file.type}, ${file.size} bytes)`));
      
      // Combine existing and new files, ensuring no more than 3 total
      setSelectedImages(prevImages => {
        console.log('Previous images count:', prevImages.length);
        const combined = [...prevImages, ...newFiles];
        console.log('Combined images count:', combined.length);
        const final = combined.slice(0, 3); // Limit to 3 images
        console.log('Final images count (after limit):', final.length);
        
        // Log detailed info for each selected image
        console.log('\n=== DETAILED IMAGE SELECTION INFO ===');
        final.forEach((file, index) => {
          console.log(`\nImage ${index + 1} Selected:`);
          console.log('📁 Name:', file.name);
          console.log('🎭 Type:', file.type);
          console.log('📏 Size:', file.size, 'bytes', `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          console.log('📅 Last Modified:', new Date(file.lastModified).toISOString());
          console.log('🔧 Constructor:', file.constructor.name);
          
          // Check for any unusual properties
          if (file.webkitRelativePath) {
            console.log('📂 Webkit Relative Path:', file.webkitRelativePath);
          }
          
          // Log the File object itself for debugging
          console.log('🗂️ Full File Object:', file);
        });
        console.log('=== END DETAILED IMAGE INFO ===\n');
        
        return final;
      });
      setError("")
    } else {
      console.log('No files selected');
    }
  }

  // Removes a selected image by its index
  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
  };

  // Handles camera capture (currently just a placeholder for future implementation)
  const handleCameraCapture = () => {
    // In a real application, this would open the device's camera.
    // For now, we'll simulate an error or prompt for manual upload.
    setError("Camera capture is not fully implemented yet. Please use 'Upload Photo'.");
    setStatus("error"); // Indicate an error state for now
  }

  // Internal function to handle recipe extraction, supports both URL and image data
  const handleExtractInternal = async (input: string | File[]) => {
    console.log('=== HANDLE EXTRACT INTERNAL CALLED ===');
    console.log('Input type:', typeof input);
    console.log('Input value:', Array.isArray(input) ? `Array with ${input.length} files` : input);

    setStatus("loading")
    setError("")

    try {
      let response;
      let data;

      if (typeof input === 'string') {
        // Handle URL extraction
        if (!input.startsWith("http")) {
          throw new Error("Please enter a valid URL (must start with http or https)");
        }
        response = await fetch(`/api/extract-recipe?url=${encodeURIComponent(input)}`);
        data = await response.json();
      } else {
        // Handle image extraction
        if (input.length === 0) {
          throw new Error("Please select at least one image.");
        }

        // Convert files to base64 strings with compression
        console.log('\n=== FRONTEND IMAGE PROCESSING ===');
        console.log('Number of files to process:', input.length);
        
        const base64Images = await Promise.all(input.map((file, index) => {
          return new Promise<string>((resolve, reject) => {
            console.log(`\nProcessing file ${index + 1}:`);
            console.log('File name:', file.name);
            console.log('File type:', file.type);
            console.log('File size:', file.size, 'bytes', `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            
                         // Create canvas for image compression
             const canvas = document.createElement('canvas');
             const ctx = canvas.getContext('2d');
             const img = new window.Image();
            
            img.onload = () => {
              console.log(`Original dimensions: ${img.width}x${img.height}`);
              
              // Calculate new dimensions (max 1024px on longest side)
              const maxSize = 1024;
              let { width, height } = img;
              
              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              
              console.log(`Compressed dimensions: ${width}x${height}`);
              
              // Draw and compress
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Convert to base64 with compression (0.7 quality for JPEG)
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
              
              console.log(`File ${index + 1} compression successful:`);
              console.log('Original size:', file.size, 'bytes');
              console.log('Compressed size:', compressedDataUrl.length, 'chars');
              console.log('Compression ratio:', ((1 - compressedDataUrl.length / (file.size * 1.37)) * 100).toFixed(1) + '%');
              
              resolve(compressedDataUrl);
            };
            
                         img.onerror = (error: Event | string) => {
               console.error(`Image load error for file ${index + 1}:`, error);
               reject(new Error(`Failed to load image: ${file.name}`));
             };
            
            // Load the image
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                img.src = e.target.result as string;
              }
            };
            reader.onerror = (error) => {
              console.error(`FileReader error for file ${index + 1}:`, error);
              reject(error);
            };
            reader.readAsDataURL(file);
          });
        }));
        
        console.log('\n=== FINAL BASE64 SUMMARY ===');
        console.log('Successfully converted images:', base64Images.length);
        base64Images.forEach((base64, index) => {
          console.log(`Image ${index + 1}: ${base64.substring(0, 50)}... (${base64.length} chars)`);
        });
        console.log('=== END FRONTEND PROCESSING ===\n');

        console.log('=== MAKING FETCH REQUEST ===');
        console.log('Endpoint: /api/extract-recipe');
        console.log('Method: POST');
        console.log('Images to send:', base64Images.length);
        console.log('Request body size estimate:', JSON.stringify({ images: base64Images }).length, 'characters');

        response = await fetch('/api/extract-recipe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ images: base64Images }),
        });

        console.log('=== FETCH RESPONSE ===');
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        data = await response.json();
        console.log('Response data:', data);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract recipe');
      }

      const recipe = data as ExtractedRecipe;
      const recipeData = encodeURIComponent(JSON.stringify(recipe));
      router.push(`/cook/1?data=${recipeData}`); // Navigate to cook page
      setStatus("success");

    } catch (err) {
      console.error('=== EXTRACTION ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('Full error:', err);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      setStatus("error");
      setError(err instanceof Error ? err.message : 'Failed to extract recipe');
    }
  }

  // Public handler for URL form submission
  const handleUrlExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleExtractInternal(url);
  }

  // Public handler for image extraction
  const handleImageExtract = async () => {
    console.log('=== HANDLE IMAGE EXTRACT CALLED ===');
    console.log('Selected images count:', selectedImages.length);
    console.log('Selected images:', selectedImages.map((file, i) => `${i + 1}: ${file.name} (${file.type}, ${file.size} bytes)`));
    
    try {
      await handleExtractInternal(selectedImages);
    } catch (error) {
      console.error('Error in handleImageExtract:', error);
      setStatus("error");
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // Determine if the "Extract Recipe" button for images should be enabled
  const isImageExtractButtonDisabled = status === "loading" || selectedImages.length === 0;

  return (
    <>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleUrlExtract} className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">Extract a recipe</h2>
              <p className="text-lg text-muted-foreground">
                Paste a URL or upload photos of any recipe and we'll transform it into a step-by-step cooking experience
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
                  disabled={status === "loading" || url.length === 0}
                  className="text-lg px-6 py-3 bg-red-500"
                >
                  {status === "loading" && typeof url === 'string' && (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Extracting...
                    </>
                  )}
                  {status !== "loading" && "Extract from URL"}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-muted"></div>
                <span className="text-muted-foreground text-lg">or</span>
                <div className="flex-1 border-t border-muted"></div>
              </div>

              <div className="grid grid-cols-1  gap-3">
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                    id="image-upload"
                    multiple // Allow multiple file selection
                    disabled={status === "loading" || selectedImages.length >= 3} // Disable if 3 images already selected
                    ref={fileInputRef} // Assign the ref
                  />
                  <label htmlFor="image-upload" onClick={() => console.log('Upload label clicked')}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-lg py-3 bg-white/80 backdrop-blur-sm border-2"
                      disabled={status === "loading" || selectedImages.length >= 3}
                      asChild
                    >
                      <div>
                        <Upload className="mr-2 h-5 w-5" />
                        Upload Photo ({selectedImages.length}/3)
                      </div>
                    </Button>
                  </label>
                </div>
{/*
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCameraCapture}
                  disabled={status === "loading" || selectedImages.length >= 3}
                  className="w-full text-lg py-3 bg-white/80 backdrop-blur-sm border-2"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Take Photo ({selectedImages.length}/3)
                </Button>
*/}
              </div>
              {/* Display selected image thumbnails */}
              {selectedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative w-full h-24 rounded-md overflow-hidden border border-gray-300">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Recipe image ${index + 1}`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full text-white p-0.5 hover:bg-opacity-75"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length > 0 && (
                <Button
                  onClick={() => {
                    console.log('=== EXTRACT BUTTON CLICKED ===');
                    console.log('Current status:', status);
                    console.log('Selected images count:', selectedImages.length);
                    console.log('Button disabled?:', isImageExtractButtonDisabled);
                    console.log('About to call handleImageExtract...');
                    handleImageExtract();
                  }}
                  disabled={isImageExtractButtonDisabled}
                  className="w-full text-lg px-6 py-3 bg-blue-500" // Different color for image extraction button
                >
                  {status === "loading" && selectedImages.length > 0 ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Images...
                    </>
                  ) : (
                    `Extract from ${selectedImages.length} Image(s)`
                  )}
                </Button>
              )}
            </div>

            {error && <p className="text-lg text-red-500">{error}</p>}

            {status === "loading" && (
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <ChefHat className="h-10 w-10 text-red-600 animate-bounce" />
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
