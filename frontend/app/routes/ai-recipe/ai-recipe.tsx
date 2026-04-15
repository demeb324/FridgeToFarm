import Anthropic from "@anthropic-ai/sdk";
import {redirect, data, Form} from "react-router";
import {v7 as uuid} from "uuid";
import {postRecipe, type Recipe} from "~/utils/models/recipe.model";
import {getSession} from "~/utils/session.server";
import type {Route} from "./+types/ai-recipe";
import {Link} from "react-router";
import {useRef, useState} from "react";
import {ShareModal} from "~/components/ShareModal";

function extractJson(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    return match ? match[1] : text.trim()
}

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

function scaleAmount(amount: string, servings: number, baseServings: number): string {
    const num = parseFloat(amount)
    if (isNaN(num) || !baseServings) return amount
    const scaled = (num * servings) / baseServings
    return scaled % 1 === 0 ? `${Math.round(scaled)}` : scaled.toFixed(1)
}

export async function loader({request}: Route.LoaderArgs) {
    const url = new URL(request.url)
    const title = url.searchParams.get('title') ?? ''
    const cuisine = url.searchParams.get('cuisine') ?? ''
    const mealType = url.searchParams.get('mealType') ?? ''
    const ingredients = url.searchParams.getAll('ingredients')

    if (!title) throw new Response("Recipe title is required", {status: 400})

    const session = await getSession(request.headers.get("Cookie"))
    const user = session.has("user") ? session.get("user") : null

    const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY})
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: "You are a chef. Respond only with valid JSON, no markdown or explanations.",
        messages: [{
            role: "user",
            content: `Generate the complete recipe for "${title}".
Cuisine: ${cuisine}. Meal type: ${mealType}.
Available fridge ingredients: ${ingredients.join(', ')}.
Return a JSON object with these exact fields:
- title (string)
- description (string, 2-3 sentences)
- prepTime (string, e.g. "15 min")
- cookTime (string, e.g. "25 min")
- totalTime (string, e.g. "40 min")
- servings (number)
- ingredients (array of objects with: name (string), amount (string), units (string — MUST be a short abbreviation of 16 characters or fewer, e.g. "g", "kg", "ml", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "whole", "slice"))
- instructions (array of objects with: stepNumber (number), instruction (string — each step MUST be 255 characters or fewer))
- nutrition (object with: calories (string), fat (string), carbs (string), protein (string))`
        }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : null
    const recipe: FullAiRecipe = JSON.parse(extractJson(text ?? '{}'))
    return {recipe, user, cuisine, mealType}
}

export async function action({request}: Route.ActionArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    if (!session.has("user")) {
        return data({error: "Please log in to save a recipe"}, {status: 401})
    }

    const formData = await request.formData()
    const recipeJson = formData.get('recipeJson') as string
    const cuisine = formData.get('cuisine') as string
    const mealType = formData.get('mealType') as string

    const aiRecipe: FullAiRecipe = JSON.parse(recipeJson)
    const user = session.get("user")!
    const authorization = session.get("authorization")!
    const cookie = request.headers.get("Cookie") ?? ''
    const id = uuid()

    const dbRecipe: Recipe = {
        id,
        userId: user.id,
        title: aiRecipe.title,
        calories: aiRecipe.nutrition.calories,
        carbs: aiRecipe.nutrition.carbs,
        fatContent: aiRecipe.nutrition.fat,
        protein: aiRecipe.nutrition.protein,
        cookTime: aiRecipe.cookTime,
        prepTime: aiRecipe.prepTime,
        totalTime: aiRecipe.totalTime,
        servings: aiRecipe.servings,
        cuisine,
        mealCategory: mealType,
        imageUrl: null,
        ingredients: aiRecipe.ingredients.map(ing => ({
            name: ing.name,
            amount: parseFloat(ing.amount) || 0,
            units: ing.units
        })),
        instructions: aiRecipe.instructions
    }

    const result = await postRecipe(dbRecipe, authorization, cookie)

    if (result.status !== 200) {
        return data({error: result.message ?? "Failed to save recipe"})
    }

    return redirect(`/recipe/${id}`)
}

export default function AiRecipe({loaderData, actionData}: Route.ComponentProps) {
    const {recipe, user, cuisine, mealType} = loaderData

    const baseServings = recipe.servings ?? 1
    const [servings, setServings] = useState(baseServings)
    const [cookMode, setCookMode] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [showShare, setShowShare] = useState(false)
    const methodRef = useRef<HTMLDivElement>(null)

    const instructions = recipe.instructions ?? []
    const ingredients = recipe.ingredients ?? []

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 mb-16">

            {/* ── Back button ── */}
            <Link
                to="/recipe-generation"
                onClick={e => { e.preventDefault(); history.back() }}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors mb-8"
            >
                ← Back to suggestions
            </Link>

            {/* ── Hero: two-column ── */}
            <div className="grid lg:grid-cols-2 gap-8 mb-10">

                {/* Image placeholder */}
                <div className="relative rounded-2xl overflow-hidden bg-amber-50 flex items-center justify-center" style={{minHeight: '280px'}}>
                    <span className="text-7xl" aria-hidden>🍳</span>
                    <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                        AI Generated
                    </span>
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">{recipe.title}</h1>
                    <p className="text-sm text-gray-500 leading-relaxed mb-5">{recipe.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {mealType && (
                            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 text-xs font-medium">
                                {mealType.toLowerCase()}
                            </span>
                        )}
                        {cuisine && (
                            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 text-xs font-medium">
                                {cuisine.toLowerCase()}
                            </span>
                        )}
                    </div>

                    {/* Time + stats grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-b border-gray-100 py-5 mb-6">
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Prep</p>
                            <p className="text-lg font-bold text-gray-900">{recipe.prepTime}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Cook</p>
                            <p className="text-lg font-bold text-gray-900">{recipe.cookTime}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Servings</p>
                            <p className="text-lg font-bold text-gray-900">{recipe.servings}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Calories</p>
                            <p className="text-lg font-bold text-gray-900">{recipe.nutrition.calories}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => methodRef.current?.scrollIntoView({behavior: 'smooth'})}
                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                            Start cooking
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowShare(true)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Share
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body: ingredients left, method right ── */}
            <div className="grid lg:grid-cols-5 gap-8">

                {/* ── Left: Ingredients + Nutrition ── */}
                <div className="lg:col-span-2">

                    {/* Ingredients header with serving scaler */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Ingredients</h2>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setServings(s => Math.max(1, s - 1))}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg"
                            >
                                −
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-gray-800">{servings}</span>
                            <button
                                type="button"
                                onClick={() => setServings(s => s + 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Ingredient list */}
                    <div className="divide-y divide-gray-100">
                        {ingredients.map((ing, i) => (
                            <div key={i} className="flex items-center justify-between py-2.5">
                                <span className="text-sm text-gray-800 capitalize">{ing.name}</span>
                                <span className="text-sm text-gray-500 shrink-0 ml-4">
                                    {scaleAmount(ing.amount, servings, baseServings)} {ing.units}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Nutrition */}
                    <div className="mt-8 border border-gray-200 rounded-xl p-4 bg-white">
                        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Nutrition per serving</p>
                        <div className="divide-y divide-gray-100">
                            {[
                                {label: 'Calories', value: recipe.nutrition.calories},
                                {label: 'Carbs',    value: recipe.nutrition.carbs},
                                {label: 'Protein',  value: recipe.nutrition.protein},
                                {label: 'Fat',      value: recipe.nutrition.fat},
                            ].map(({label, value}) => (
                                <div key={label} className="flex justify-between py-2">
                                    <span className="text-sm text-gray-600">{label}</span>
                                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right: Method ── */}
                <div className="lg:col-span-3" ref={methodRef}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Method</h2>
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
                            <button
                                type="button"
                                onClick={() => { setCookMode(false); setCurrentStep(0) }}
                                className={`px-3 py-1.5 transition-colors ${!cookMode ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Normal
                            </button>
                            <button
                                type="button"
                                onClick={() => { setCookMode(true); setCurrentStep(0) }}
                                className={`px-3 py-1.5 transition-colors ${cookMode ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Cook mode
                            </button>
                        </div>
                    </div>

                    {cookMode ? (
                        <div>
                            <p className="text-xs text-gray-400 mb-4">Step {currentStep + 1} of {instructions.length}</p>
                            <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6 min-h-48">
                                <div className="flex gap-4">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                                        {instructions[currentStep]?.stepNumber}
                                    </span>
                                    <p className="text-gray-800 leading-relaxed">{instructions[currentStep]?.instruction}</p>
                                </div>
                            </div>
                            <div className="flex justify-between mt-4">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    disabled={currentStep === 0}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                >
                                    ← Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(s => Math.min(instructions.length - 1, s + 1))}
                                    disabled={currentStep === instructions.length - 1}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {instructions.map((step, i) => (
                                <div key={step.stepNumber} className="border border-gray-200 bg-white rounded-xl p-4 flex gap-4">
                                    <span className="w-7 h-7 rounded-full bg-gray-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
                                        {step.stepNumber}
                                    </span>
                                    <p className="text-sm text-gray-700 leading-relaxed">{step.instruction}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Save recipe ── */}
            <div className="mt-14 border-t border-gray-100 pt-10">
                {actionData && 'error' in actionData && (
                    <p className="text-sm text-red-500 mb-4">{actionData.error}</p>
                )}

                {user ? (
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Save this recipe</h2>
                        <p className="text-sm text-gray-500 mb-4">Add it to your collection so you can find it later.</p>
                        <Form method="POST">
                            <input type="hidden" name="recipeJson" value={JSON.stringify(recipe)} />
                            <input type="hidden" name="cuisine" value={cuisine} />
                            <input type="hidden" name="mealType" value={mealType} />
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Save recipe
                            </button>
                        </Form>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">
                        <Link to="/login" className="text-amber-600 hover:text-amber-700 font-medium hover:underline">Log in</Link> to save this recipe to your collection.
                    </p>
                )}
            </div>

            {showShare && <ShareModal onClose={() => setShowShare(false)} />}
        </div>
    )
}
