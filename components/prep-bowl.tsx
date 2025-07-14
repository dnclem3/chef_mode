import { IceCreamBowlIcon as Bowl } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PrepBowlProps {
  name: string
  ingredients: string[]
}

export default function PrepBowl({ name, ingredients }: PrepBowlProps) {
  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-2 border-orange-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl flex items-center gap-3 text-gray-800">
          <Bowl className="h-6 w-6 text-emerald-600" />
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-600 flex-shrink-0"></span>
              <span className="text-xl text-gray-700 leading-relaxed">{ingredient}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
