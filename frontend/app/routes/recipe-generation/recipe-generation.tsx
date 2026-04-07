import {GoogleGenAI} from "@google/genai";
import {getRecipesByCuisineAndMealCategory, type Recipe} from "~/utils/models/recipe.model";
import type {Route} from "./+types/recipe-generation";
import {RecipeCard} from "~/components/recipeCard";

type RecipeSuggestion = {
    title: string
    description: string
    prepTime: string
    cookTime: string
    usedIngredients: string[]
}

async function fetchGeminiSuggestions(
    ingredients: string[],
    mealType: string,
    cuisine: string
): Promise<RecipeSuggestion[]> {
    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY})
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: {responseMimeType: 'application/json'},
        contents: [{
            text: `You are a chef. Given these fridge ingredients: ${ingredients.join(', ')}, suggest exactly 3 ${cuisine} ${mealType} recipes that can be made. Return a JSON array of 3 objects with fields: title (string), description (1-2 sentence string), prepTime (string like "10 min"), cookTime (string like "20 min"), usedIngredients (array of strings from the provided list).`
        }]
    })
    return JSON.parse(result.text ?? '[]')
}

export async function loader({request}: Route.LoaderArgs) {
    const url = new URL(request.url)
    const ingredients = url.searchParams.getAll('ingredients')
    const mealType = url.searchParams.get('mealType') ?? ''
    const cuisine = url.searchParams.get('cuisine') ?? ''

    const [aiSuggestions, dbRecipes] = await Promise.all([
        fetchGeminiSuggestions(ingredients, mealType, cuisine),
        getRecipesByCuisineAndMealCategory(cuisine, mealType),
    ])

    return {aiSuggestions, dbRecipes, mealType, cuisine}
}

export default function RecipeGeneration({loaderData}: Route.ComponentProps) {
    const {aiSuggestions, dbRecipes, mealType, cuisine} = loaderData

    return (
        <>
            <h1 className="mx-16 mt-16 mb-2 font-bold text-3xl">
                Recipe Suggestions
            </h1>
            <p className="mx-16 mb-12 text-body">
                {[cuisine, mealType].filter(Boolean).join(' · ')}
            </p>

            <section className="mx-16 mb-16">
                <h2 className="font-bold text-2xl mb-6">AI Suggested Recipes</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-6">
                    {aiSuggestions.map((recipe) => (
                        <div
                            key={recipe.title}
                            className="border border-default-medium rounded-base p-6 flex flex-col gap-3 bg-neutral-secondary-medium"
                        >
                            <h3 className="font-semibold text-lg text-heading">{recipe.title}</h3>
                            <p className="text-body text-sm">{recipe.description}</p>
                            <div className="flex gap-4 text-sm text-body">
                                <span>Prep: {recipe.prepTime}</span>
                                <span>Cook: {recipe.cookTime}</span>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-body mb-1">Uses from your fridge:</p>
                                <div className="flex flex-wrap gap-1">
                                    {recipe.usedIngredients.map((ing) => (
                                        <span
                                            key={ing}
                                            className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5"
                                        >
                                            {ing}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-16 mb-28">
                <h2 className="font-bold text-2xl mb-6">From Our Collection</h2>
                {dbRecipes.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center">
                        {dbRecipes.map((recipe: Recipe) => (
                            <RecipeCard key={recipe.id} recipe={recipe} reviews={[]}/>
                        ))}
                    </div>
                ) : (
                    <p className="text-body">No saved recipes found for {[cuisine, mealType].filter(Boolean).join(' ')}.</p>
                )}
            </section>
        </>
    )
}
