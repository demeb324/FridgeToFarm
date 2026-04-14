import Anthropic from "@anthropic-ai/sdk";
import {getRecipesByCuisineAndMealCategory, type Recipe} from "~/utils/models/recipe.model";
import {fetchUserById} from "~/utils/models/user.model";
import {getRecipeReviews} from "~/utils/models/review.model";
import type {Route} from "./+types/recipe-generation";
import {RecipeCard} from "~/components/recipeCard";
import {Link} from "react-router";

function extractJson(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    return match ? match[1] : text.trim()
}

type RecipeSuggestion = {
    title: string
    description: string
    prepTime: string
    cookTime: string
    usedIngredients: string[]
}

async function fetchAiSuggestions(
    ingredients: string[],
    mealType: string,
    cuisine: string
): Promise<RecipeSuggestion[]> {
    const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY})
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: "You are a chef. Respond only with valid JSON, no markdown or explanations.",
        messages: [{
            role: "user",
            content: `Given these fridge ingredients: ${ingredients.join(', ')}, suggest exactly 3 ${cuisine} ${mealType} recipes that can be made. Return a JSON array of 3 objects with fields: title (string), description (1-2 sentence string), prepTime (string like "10 min"), cookTime (string like "20 min"), usedIngredients (array of strings from the provided list).`
        }]
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : null
    return JSON.parse(extractJson(text ?? '[]'))
}

const AI_CARD_BG = [
    "bg-amber-50",
    "bg-green-50",
    "bg-blue-50",
]

export async function loader({request}: Route.LoaderArgs) {
    const url = new URL(request.url)
    const ingredients = url.searchParams.getAll('ingredients')
    const mealType = url.searchParams.get('mealType') ?? ''
    const cuisine = url.searchParams.get('cuisine') ?? ''

    const [aiSuggestions, dbRecipes] = await Promise.all([
        fetchAiSuggestions(ingredients, mealType, cuisine),
        getRecipesByCuisineAndMealCategory(cuisine, mealType),
    ])

    const reviewsMap = await getRecipeReviews(dbRecipes)
    const reviews = Object.fromEntries(reviewsMap)

    const uniqueUserIds = [...new Set(dbRecipes.map((r: Recipe) => r.userId))]
    const userResults = await Promise.all(uniqueUserIds.map(id => fetchUserById(id)))
    const usernameMap: Record<string, string> = {}
    uniqueUserIds.forEach((id, i) => {
        const u = userResults[i]
        if (u) usernameMap[id] = u.username
    })

    return {aiSuggestions, dbRecipes, reviews, usernameMap, ingredients, mealType, cuisine}
}

export default function RecipeGeneration({loaderData}: Route.ComponentProps) {
    const {aiSuggestions, dbRecipes, reviews, usernameMap, ingredients, mealType, cuisine} = loaderData

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recipe suggestions</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {[cuisine, mealType].filter(Boolean).join(' · ')} · based on {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Link
                    to="/#upload"
                    className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
                >
                    Upload new photo <span aria-hidden>↗</span>
                </Link>
            </div>

            {/* ── Ingredient context pills ── */}
            <div className="flex flex-wrap gap-1.5 mt-4 mb-8">
                {ingredients.map(ing => (
                    <span key={ing} className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium capitalize">
                        {ing}
                    </span>
                ))}
            </div>

            {/* ── AI Suggestions ── */}
            <section className="mb-12">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-6">
                    AI suggested recipes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiSuggestions.map((recipe, i) => {
                        const params = new URLSearchParams()
                        params.set('title', recipe.title)
                        params.set('cuisine', cuisine)
                        params.set('mealType', mealType)
                        ingredients.forEach(ing => params.append('ingredients', ing))

                        return (
                            <div key={recipe.title} className="border border-gray-200 rounded-2xl overflow-hidden bg-white flex flex-col">
                                {/* Image area */}
                                <div className={`${AI_CARD_BG[i % AI_CARD_BG.length]} h-44 flex items-center justify-center`}>
                                    <span className="text-5xl" aria-hidden>🍳</span>
                                </div>

                                {/* Content */}
                                <div className="px-4 pt-4 pb-5 flex flex-col gap-2 flex-1">
                                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{recipe.title}</h3>
                                    <p className="text-xs text-gray-500 leading-snug line-clamp-2">{recipe.description}</p>

                                    {/* Time tags */}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                            Prep {recipe.prepTime}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                            Cook {recipe.cookTime}
                                        </span>
                                    </div>

                                    {/* Used ingredients */}
                                    {recipe.usedIngredients.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {recipe.usedIngredients.map(ing => (
                                                <span key={ing} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs capitalize border border-amber-100">
                                                    {ing}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="mt-auto pt-3">
                                        <Link
                                            to={`/ai-recipe?${params.toString()}`}
                                            className="block w-full text-center text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-4 py-2 transition-colors"
                                        >
                                            Make this recipe →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ── From Our Collection ── */}
            <section>
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-6">
                    From our collection
                </p>
                {dbRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dbRecipes.map((recipe: Recipe, i: number) => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                reviews={reviews[recipe.id] ?? []}
                                index={i}
                                username={usernameMap[recipe.userId]}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-2xl p-10 text-center bg-white">
                        <p className="text-sm text-gray-500">
                            No saved recipes found for{' '}
                            <span className="font-medium text-gray-700">{[cuisine, mealType].filter(Boolean).join(' ')}</span>.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Try the AI suggestions above!</p>
                    </div>
                )}
            </section>

        </div>
    )
}
