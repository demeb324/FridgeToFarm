import {data} from "react-router";
import {getRecipeById} from "~/utils/models/recipe.model";
import {getReviewsByRecipeId, postReview, ReviewFormSchema, type Review} from "~/utils/models/review.model";
import {RecipeRating} from "~/components/recipe-rating";
import {getSession} from "~/utils/session.server";
import {zodResolver} from "@hookform/resolvers/zod";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";
import {Rating, RatingStar} from "flowbite-react";
import type {Route} from "./+types/recipe-detail";

const resolver = zodResolver(ReviewFormSchema)

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

    const hasReviewed = user ? reviews.some((r: Review) => r.userId === user.id) : false

    const {register, handleSubmit, formState: {errors}} = useRemixForm({
        resolver,
        defaultValues: {body: '', rating: ''},
        submitConfig: {method: 'POST'}
    })

    return (
        <div className="max-w-3xl mx-auto px-8 py-16 mb-28">
            <h1 className="font-bold text-3xl mb-2">{recipe.title}</h1>
            <p className="text-body text-sm mb-4">{recipe.cuisine} · {recipe.mealCategory}</p>

            <div className="mb-8">
                <RecipeRating reviews={reviews}/>
            </div>

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
                    {(recipe.ingredients ?? []).map((ing, i) => (
                        <li key={i} className="text-body">
                            {ing.amount} {ing.units} {ing.name}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Instructions</h2>
                <ol className="space-y-6">
                    {(recipe.instructions ?? []).map((step) => (
                        <li key={step.stepNumber} className="flex gap-4">
                            <span className="font-bold text-blue-600 text-lg w-6 shrink-0">{step.stepNumber}</span>
                            <p className="text-body">{step.instruction}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Nutrition Facts <span className="text-sm font-normal text-body">per serving</span></h2>
                <div className="flex gap-8">
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.calories}</p>
                        <p className="text-body text-sm">Calories</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.fatContent}</p>
                        <p className="text-body text-sm">Fat</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.carbs}</p>
                        <p className="text-body text-sm">Carbs</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.protein}</p>
                        <p className="text-body text-sm">Protein</p>
                    </div>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Reviews</h2>
                {reviews.length === 0 ? (
                    <p className="text-body">No reviews yet.</p>
                ) : (
                    <div className="space-y-6">
                        {reviews.map((review: Review) => (
                            <div key={`${review.recipeId}-${review.userId}`} className="border border-default-medium rounded-base p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-sm">{review.username ?? 'Anonymous'}</span>
                                    <Rating>
                                        {Array.from({length: review.rating}, (_, i) => (
                                            <RatingStar key={`f-${i}`} filled />
                                        ))}
                                        {Array.from({length: 5 - review.rating}, (_, i) => (
                                            <RatingStar key={`e-${i}`} filled={false} />
                                        ))}
                                    </Rating>
                                    <span className="text-sm text-body">{review.rating}/5</span>
                                </div>
                                <p className="text-body mb-1">{review.body}</p>
                                {review.createdAt && (
                                    <p className="text-body text-xs">{new Date(review.createdAt).toLocaleDateString()}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {user && !hasReviewed && (
                <section>
                    <h2 className="font-bold text-2xl mb-4">Leave a Review</h2>

                    {actionData && 'success' in actionData && actionData.success && (
                        <p className="text-green-600 mb-4">Review submitted successfully!</p>
                    )}
                    {actionData && 'success' in actionData && !actionData.success && (
                        <p className="text-red-500 mb-4">{actionData.status?.message}</p>
                    )}

                    <form onSubmit={handleSubmit} method="POST" className="space-y-4">
                        <div>
                            <label htmlFor="rating" className="block font-medium mb-1">Rating</label>
                            <select
                                {...register('rating')}
                                id="rating"
                                className="block w-full max-w-xs px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs"
                            >
                                <option value="">Select a rating</option>
                                <option value="1">1 Star</option>
                                <option value="2">2 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="5">5 Stars</option>
                            </select>
                            {errors.rating && (
                                <p className="text-red-500 text-sm mt-1">{errors.rating.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="body" className="block font-medium mb-1">Your Review</label>
                            <textarea
                                {...register('body')}
                                id="body"
                                rows={4}
                                maxLength={256}
                                placeholder="Write your review here..."
                                className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                            />
                            {errors.body && (
                                <p className="text-red-500 text-sm mt-1">{errors.body.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="text-white bg-blue-600 border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
                        >
                            Submit Review
                        </button>
                    </form>
                </section>
            )}

            {user && hasReviewed && (
                <p className="text-body italic">You have already reviewed this recipe.</p>
            )}

            {!user && (
                <p className="text-body italic">
                    <a href="/login" className="text-blue-600 underline hover:no-underline">Log in</a> to leave a review
                </p>
            )}
        </div>
    )
}
