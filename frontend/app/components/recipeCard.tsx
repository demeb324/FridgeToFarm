import type {Recipe} from "~/utils/models/recipe.model";
import type {Review} from "~/utils/models/review.model";
import {Link} from "react-router";

const CARD_BG = [
    "bg-green-50",
    "bg-amber-50",
    "bg-blue-50",
    "bg-pink-50",
    "bg-purple-50",
    "bg-teal-50",
]

export function RecipeCard({ recipe, reviews, index = 0, username }: { recipe: Recipe; reviews: Review[]; index?: number; username?: string }) {
    const bg = CARD_BG[index % CARD_BG.length]

    const avgRating = reviews?.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null

    const ingredientNames = recipe.ingredients?.slice(0, 4).map(ing => ing.name).join(", ")

    return (
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white flex flex-col">
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
            </div>

            {/* Content */}
            <div className="px-4 pt-4 pb-5 flex flex-col gap-2 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">{recipe.title}</h3>

                {username && (
                    <p className="text-xs text-gray-400">by {username}</p>
                )}

                {ingredientNames && (
                    <p className="text-xs text-gray-400 leading-snug line-clamp-2">{ingredientNames}</p>
                )}

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
                        <span className="text-xs text-gray-400">★ {avgRating} ({reviews.length})</span>
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
}
