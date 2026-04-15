import {data} from "react-router";
import {getRecipeById} from "~/utils/models/recipe.model";
import {getReviewsByRecipeId, postReview, ReviewFormSchema, type Review} from "~/utils/models/review.model";
import {getSession} from "~/utils/session.server";
import {zodResolver} from "@hookform/resolvers/zod";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";
import {Rating, RatingStar} from "flowbite-react";
import type {Route} from "./+types/recipe-detail";
import {Link} from "react-router";
import {useRef, useState} from "react";
import {ShareModal} from "~/components/ShareModal";
import {Stopwatch} from "~/components/Stopwatch";

const resolver = zodResolver(ReviewFormSchema)

function scaleAmount(amount: number, servings: number, baseServings: number): string {
    if (!baseServings) return `${amount}`
    const scaled = (amount * servings) / baseServings
    return scaled % 1 === 0 ? `${Math.round(scaled)}` : scaled.toFixed(1)
}

export async function loader({params, request}: Route.LoaderArgs) {
    const recipe = await getRecipeById(params.id)
    if (!recipe) throw new Response("Recipe not found", {status: 404})

    const session = await getSession(request.headers.get("Cookie"))
    const user = session.has("user") ? session.get("user") : null
    const reviews = await getReviewsByRecipeId(params.id) ?? []

    return {recipe, reviews, user}
}

export async function action({request, params}: Route.ActionArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    if (!session.has("user")) {
        return data({success: false, status: {status: 401, data: null, message: "Please log in to submit a review"}})
    }

    const {errors, data: formData, receivedValues: defaultValues} = await getValidatedFormData(request, resolver)
    if (errors) {
        return {errors, defaultValues}
    }

    const user = session.get("user")!
    const authorization = session.get("authorization")!
    const cookie = request.headers.get("Cookie") ?? ''

    const result = await postReview({
        recipeId: params.id,
        userId: user.id,
        body: formData.body,
        rating: formData.rating,
        createdAt: null
    }, authorization, cookie)

    return data({success: true, status: result})
}

export default function RecipeDetail({loaderData, actionData}: Route.ComponentProps) {
    const {recipe, reviews, user} = loaderData

    const baseServings = recipe.servings ?? 1
    const [servings, setServings] = useState(baseServings)
    const [cookMode, setCookMode] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const methodRef = useRef<HTMLDivElement>(null)

    const avgRating = reviews.length
        ? (reviews.reduce((s: number, r: Review) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null

    const hasReviewed = user ? reviews.some((r: Review) => r.userId === user.id) : false

    const [hoverRating, setHoverRating] = useState(0)
    const [showShare, setShowShare] = useState(false)
    const [cookingSignal, setCookingSignal] = useState(0)

    const {register, handleSubmit, watch, setValue, formState: {errors}} = useRemixForm({
        resolver,
        defaultValues: {body: '', rating: ''},
        submitConfig: {method: 'POST'}
    })

    const instructions = recipe.instructions ?? []
    const ingredients = recipe.ingredients ?? []

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 mb-16">

            {/* ── Back button ── */}
            <Link
                to="/meals"
                onClick={e => { e.preventDefault(); history.back() }}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors mb-8"
            >
                ← Back
            </Link>

            {/* ── Hero: two-column ── */}
            <div className="grid lg:grid-cols-2 gap-8 mb-10">

                {/* Image */}
                <div className="relative rounded-2xl overflow-hidden bg-blue-50 flex items-center justify-center" style={{minHeight: '280px'}}>
                    {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                        <span className="text-7xl" aria-hidden>🍽️</span>
                    )}
                    {avgRating && (
                        <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                            ★ {avgRating}
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">{recipe.title}</h1>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {recipe.mealCategory && (
                            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 text-xs font-medium">
                                {recipe.mealCategory.toLowerCase()}
                            </span>
                        )}
                        {recipe.cuisine && (
                            <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 text-xs font-medium">
                                {recipe.cuisine.toLowerCase()}
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
                            <p className="text-lg font-bold text-gray-900">{recipe.calories}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setCookingSignal(s => s + 1)}
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
                    <Stopwatch startSignal={cookingSignal} />
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
                                {label: 'Calories', value: recipe.calories},
                                {label: 'Carbs',    value: recipe.carbs},
                                {label: 'Protein',  value: recipe.protein},
                                {label: 'Fat',      value: recipe.fatContent},
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
                        /* Cook mode: one step at a time */
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
                        /* Normal mode: all steps */
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

            {/* ── Reviews ── */}
            <div className="mt-14 border-t border-gray-100 pt-10">
                <h2 className="text-lg font-bold text-gray-900 mb-6">
                    Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal text-base">({reviews.length})</span>}
                </h2>

                {reviews.length === 0 ? (
                    <p className="text-sm text-gray-400">No reviews yet. Be the first!</p>
                ) : (
                    <div className="space-y-4 mb-8">
                        {reviews.map((review: Review) => (
                            <div key={`${review.recipeId}-${review.userId}`} className="border border-gray-200 rounded-xl p-4 bg-white">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-sm text-gray-800">{review.username ?? 'Anonymous'}</span>
                                    <Rating>
                                        {Array.from({length: review.rating}, (_, i) => <RatingStar key={`f-${i}`} filled />)}
                                        {Array.from({length: 5 - review.rating}, (_, i) => <RatingStar key={`e-${i}`} filled={false} />)}
                                    </Rating>
                                    <span className="text-xs text-gray-400">{review.rating}/5</span>
                                </div>
                                <p className="text-sm text-gray-700">{review.body}</p>
                                {review.createdAt && (
                                    <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Leave a review */}
                {user && !hasReviewed && (
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 mb-4">Leave a review</h3>

                        {actionData && 'success' in actionData && actionData.success && (
                            <p className="text-sm text-emerald-600 mb-4">Review submitted — thanks!</p>
                        )}
                        {actionData && 'success' in actionData && !actionData.success && (
                            <p className="text-sm text-red-500 mb-4">{actionData.status?.message}</p>
                        )}

                        <form onSubmit={handleSubmit} method="POST" className="space-y-4 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                                <input type="hidden" {...register('rating')} />
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(n => {
                                        const filled = n <= (hoverRating || Number(watch('rating')))
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setValue('rating', n.toString(), {shouldValidate: true})}
                                                onMouseEnter={() => setHoverRating(n)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                                                className="text-3xl transition-transform hover:scale-110"
                                            >
                                                <span className={filled ? 'text-amber-400' : 'text-gray-200'}>★</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1.5">Your review</label>
                                <textarea
                                    {...register('body')}
                                    id="body"
                                    rows={4}
                                    maxLength={256}
                                    placeholder="Write your review here…"
                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-y placeholder:text-gray-400"
                                />
                                {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
                            </div>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Submit review
                            </button>
                        </form>
                    </div>
                )}

                {user && hasReviewed && (
                    <p className="text-sm text-gray-400 italic">You've already reviewed this recipe.</p>
                )}

                {!user && (
                    <p className="text-sm text-gray-500">
                        <Link to="/login" className="text-amber-600 hover:text-amber-700 font-medium hover:underline">Log in</Link> to leave a review.
                    </p>
                )}
            </div>

            {showShare && <ShareModal onClose={() => setShowShare(false)} />}
        </div>
    )
}
