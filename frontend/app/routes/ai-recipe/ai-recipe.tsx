import {GoogleGenAI} from "@google/genai";
import type {Route} from "./+types/ai-recipe";

type FullAiRecipe = {
    title: string
    description: string
    prepTime: string
    cookTime: string
    totalTime: string
    servings: number
    ingredients: Array<{name: string, amount: string, units: string}>
    instructions: Array<{stepNumber: number, instruction: string}>
    nutrition: {calories: string, fat: string, carbs: string, protein: string}
}

export async function loader({request}: Route.LoaderArgs) {
    const url = new URL(request.url)
    const title = url.searchParams.get('title') ?? ''
    const cuisine = url.searchParams.get('cuisine') ?? ''
    const mealType = url.searchParams.get('mealType') ?? ''
    const ingredients = url.searchParams.getAll('ingredients')

    if (!title) throw new Response("Recipe title is required", {status: 400})

    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY})
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: {responseMimeType: 'application/json'},
        contents: [{
            text: `You are a chef. Generate the complete recipe for "${title}".
Cuisine: ${cuisine}. Meal type: ${mealType}.
Available fridge ingredients: ${ingredients.join(', ')}.
Return a JSON object with these exact fields:
- title (string)
- description (string, 2-3 sentences)
- prepTime (string, e.g. "15 min")
- cookTime (string, e.g. "25 min")
- totalTime (string, e.g. "40 min")
- servings (number)
- ingredients (array of objects with: name (string), amount (string), units (string))
- instructions (array of objects with: stepNumber (number), instruction (string, full detail))
- nutrition (object with: calories (string), fat (string), carbs (string), protein (string))`
        }]
    })

    const recipe: FullAiRecipe = JSON.parse(result.text ?? '{}')
    return {recipe}
}

export default function AiRecipe({loaderData}: Route.ComponentProps) {
    const {recipe} = loaderData

    return (
        <div className="max-w-3xl mx-auto px-8 py-16 mb-28">
            <p className="text-blue-600 text-sm font-medium mb-2">AI Generated Recipe</p>
            <h1 className="font-bold text-3xl mb-2">{recipe.title}</h1>
            <p className="text-body mb-8">{recipe.description}</p>

            <div className="flex gap-8 mb-10 text-center">
                <div>
                    <p className="font-semibold text-lg">{recipe.prepTime}</p>
                    <p className="text-body text-sm">Prep</p>
                </div>
                <div>
                    <p className="font-semibold text-lg">{recipe.cookTime}</p>
                    <p className="text-body text-sm">Cook</p>
                </div>
                <div>
                    <p className="font-semibold text-lg">{recipe.totalTime}</p>
                    <p className="text-body text-sm">Total</p>
                </div>
                <div>
                    <p className="font-semibold text-lg">{recipe.servings}</p>
                    <p className="text-body text-sm">Servings</p>
                </div>
            </div>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Ingredients</h2>
                <ul className="list-disc list-inside space-y-1">
                    {recipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-body">
                            {ing.amount} {ing.units} {ing.name}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Instructions</h2>
                <ol className="space-y-6">
                    {recipe.instructions.map((step) => (
                        <li key={step.stepNumber} className="flex gap-4">
                            <span className="font-bold text-blue-600 text-lg w-6 shrink-0">{step.stepNumber}</span>
                            <p className="text-body">{step.instruction}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section>
                <h2 className="font-bold text-2xl mb-4">Nutrition Facts <span className="text-sm font-normal text-body">per serving</span></h2>
                <div className="flex gap-8">
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.nutrition.calories}</p>
                        <p className="text-body text-sm">Calories</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.nutrition.fat}</p>
                        <p className="text-body text-sm">Fat</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.nutrition.carbs}</p>
                        <p className="text-body text-sm">Carbs</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.nutrition.protein}</p>
                        <p className="text-body text-sm">Protein</p>
                    </div>
                </div>
            </section>
        </div>
    )
}
