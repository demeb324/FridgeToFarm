import type {Route} from "./+types/meals"
import {getAllRecipes} from "~/utils/models/recipe.model";
import {getRecipeReviews} from "~/utils/models/review.model";
import type {Recipe} from "~/utils/models/recipe.model";
import {fetchUserById} from "~/utils/models/user.model";
import {Link, useSearchParams} from "react-router";
import {useState} from "react";

export async function loader({request}: Route.LoaderArgs) {
    const url = new URL(request.url)
    const mealCategory = url.searchParams.get("mealCategory") ?? ""
    const cuisine = url.searchParams.get("cuisine") ?? ""
    const ingredient = url.searchParams.get("ingredient") ?? ""

    let recipes: Recipe[] = await getAllRecipes()
    const allRecipes = recipes // keep full list for stats

    if (mealCategory) recipes = recipes.filter(r => r.mealCategory.toLowerCase() === mealCategory.toLowerCase())
    if (cuisine) recipes = recipes.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase())
    if (ingredient) recipes = recipes.filter(r =>
        r.ingredients.some(i => i.name.toLowerCase().includes(ingredient.toLowerCase()))
    )

    const reviewsMap = await getRecipeReviews(recipes)
    const reviews = Object.fromEntries(reviewsMap)

    const uniqueUserIds = [...new Set(recipes.map(r => r.userId))]
    const userResults = await Promise.all(uniqueUserIds.map(id => fetchUserById(id)))
    const usernameMap: Record<string, string> = {}
    uniqueUserIds.forEach((id, i) => { if (userResults[i]) usernameMap[id] = userResults[i]!.username })

    return {recipes, reviews, allRecipes, usernameMap}
}

// ── Pastel card backgrounds ───────────────────────────────────
const CARD_BG = [
    "bg-green-50",
    "bg-amber-50",
    "bg-blue-50",
    "bg-pink-50",
    "bg-purple-50",
    "bg-teal-50",
]

// ── Parse cook time string to minutes ("30 min" → 30) ────────
function parseMinutes(s: string): number {
    const match = s.match(/(\d+)/)
    return match ? parseInt(match[1]) : 0
}

export default function Meals({loaderData}: Route.ComponentProps) {
    const {recipes, reviews, allRecipes, usernameMap} = loaderData
    const [searchParams] = useSearchParams()
    const activeCat = searchParams.get("mealCategory") ?? ""

    const [textSearch, setTextSearch] = useState("")

    // Client-side text filter on top of server-side category filter
    const displayed = recipes.filter(r =>
        r.title.toLowerCase().includes(textSearch.toLowerCase())
    )

    // Stats derived from full recipe list
    const avgCookMin = allRecipes.length
        ? Math.round(allRecipes.reduce((sum, r) => sum + parseMinutes(r.cookTime), 0) / allRecipes.length)
        : 0
    const uniqueCuisines = new Set(allRecipes.map(r => r.cuisine)).size
    const uniqueCategories = new Set(allRecipes.map(r => r.mealCategory)).size

    const MEAL_CATS = ["Breakfast", "Lunch", "Dinner", "Snack"]

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My meals</h1>
                    <p className="text-sm text-gray-500 mt-1">Browse and filter recipes from our collection.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Link
                        to="/#upload"
                        className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Upload photo <span aria-hidden>↗</span>
                    </Link>
                    <Link
                        to="/meals"
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Browse all
                    </Link>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[
                    {label: "Recipes available", value: allRecipes.length, sub: `${uniqueCategories} categories`},
                    {label: "Cuisines", value: uniqueCuisines, sub: "from around the world"},
                    {label: "Avg. cook time", value: `${avgCookMin}m`, sub: "across all meals"},
                    {label: "Meal categories", value: uniqueCategories, sub: "breakfast to dinner"},
                ].map(stat => (
                    <div key={stat.label} className="border border-gray-200 rounded-xl px-4 py-4 bg-white">
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Filter pills (meal category) ── */}
            <div className="flex flex-wrap gap-2 mt-6">
                <Link
                    to="/meals"
                    className={[
                        "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                        !activeCat ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-500 hover:bg-gray-50",
                    ].join(" ")}
                >
                    All
                </Link>
                {MEAL_CATS.map(cat => (
                    <Link
                        key={cat}
                        to={`/meals?mealCategory=${cat}`}
                        className={[
                            "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                            activeCat === cat ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-500 hover:bg-gray-50",
                        ].join(" ")}
                    >
                        {cat}
                    </Link>
                ))}
            </div>

            {/* ── Search ── */}
            <input
                type="text"
                value={textSearch}
                onChange={e => setTextSearch(e.target.value)}
                placeholder="Search recipes..."
                className="mt-4 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
            />

            {/* ── Recipe grid ── */}
            {displayed.length === 0 ? (
                <p className="mt-16 text-center text-sm text-gray-400">No recipes found.</p>
            ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayed.map((recipe, i) => {
                        const ingredientNames = recipe.ingredients.slice(0, 4).map(ing => ing.name).join(", ")
                        const bg = CARD_BG[i % CARD_BG.length]
                        const reviewList = reviews[recipe.id] ?? []
                        const avgRating = reviewList.length
                            ? (reviewList.reduce((s: number, r: any) => s + r.rating, 0) / reviewList.length).toFixed(1)
                            : null

                        return (
                            <div key={recipe.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white flex flex-col">
                                {/* Image area */}
                                <div className={`${bg} h-44 flex items-center justify-center relative`}>
                                    {recipe.imageUrl ? (
                                        <img
                                            src={recipe.imageUrl}
                                            alt={recipe.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-5xl" aria-hidden>🍽️</span>
                                    )}
                                    {/* Save button */}
                                    <button
                                        type="button"
                                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                                        aria-label="Save recipe"
                                    >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="px-4 pt-4 pb-5 flex flex-col gap-2 flex-1">
                                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{recipe.title}</h3>
                                    {usernameMap[recipe.userId] && (
                                        <p className="text-xs text-gray-400 -mt-1">by {usernameMap[recipe.userId]}</p>
                                    )}
                                    <p className="text-xs text-gray-400 leading-snug line-clamp-2">{ingredientNames}</p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {recipe.mealCategory && (
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                                {recipe.mealCategory.toLowerCase()}
                                            </span>
                                        )}
                                        {recipe.cookTime && (
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                                {recipe.cookTime}
                                            </span>
                                        )}
                                        {recipe.cuisine && (
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                                {recipe.cuisine.toLowerCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between mt-auto pt-3">
                                        {avgRating ? (
                                            <span className="text-xs text-gray-400">★ {avgRating} ({reviewList.length})</span>
                                        ) : (
                                            <span className="text-xs text-gray-300">No reviews yet</span>
                                        )}
                                        <Link
                                            to={`/recipe/${recipe.id}`}
                                            className="text-xs font-medium text-amber-500 hover:text-amber-600 flex items-center gap-0.5 transition-colors"
                                        >
                                            View recipe <span aria-hidden>→</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
