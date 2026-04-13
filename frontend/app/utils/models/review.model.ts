import {z} from "zod/v4";
import type {Recipe} from "~/utils/models/recipe.model";
import type {Status} from "~/utils/interfaces/Status";

export const ReviewSchema = z.object({
    recipeId: z.uuidv7('please provide a recipe Id'),
    userId: z.uuidv7('please provide a user id'),
    body: z.string('Please provide a review'),
    createdAt: z.date('please provide a review date')
        .nullable(),
    rating: z.number('please provide a review rating number'),
    username: z.string().optional(),
})
/**
 * review type inferred from schema
 *Im
 */

export type Review = z.infer<typeof ReviewSchema>

export async function getRecipeReviews(recipes: Recipe[]): Promise<Map<string, Review[]>> {
    // Extract unique profile IDs from reviews
    const recipeIds: string[] = recipes.map((recipe: Recipe) => recipe.id)

    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    }

    const reviewPromise = recipeIds.map(async (recipeId: string): Promise<{recipeId: string, reviews: Review[]}> => {
        const response = await fetch(`${process.env.REST_API_URL}/review/recipeId/${recipeId}`, {
            method: 'GET',
            headers,
            credentials: 'include'
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch user reviews for recipe ${recipeId}`)
        }

        const result: Status = await response.json()
        console.log(result)
        return { recipeId, reviews: result.data }
    })

    const reviewResults = await Promise.all(reviewPromise)

    return new Map(reviewResults.map(({ recipeId, reviews}) => [recipeId, reviews]))
}

export async function getReviewsByRecipeId(recipeId: string): Promise<Review[]> {
    const response = await fetch(`${process.env.REST_API_URL}/review/recipeId/${recipeId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    })
    if (!response.ok) {
        throw new Error(`Failed to fetch reviews for recipe ${recipeId}`)
    }
    const result: Status = await response.json()
    return (result.data as Review[]) ?? []
}

export async function postReview(review: { recipeId: string, userId: string, body: string, rating: number, createdAt: null }, authorization: string, cookie: string): Promise<Status> {
    const response = await fetch(`${process.env.REST_API_URL}/review`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authorization,
            'Cookie': cookie
        },
        body: JSON.stringify(review)
    })
    return await response.json() as Status
}

export const ReviewFormSchema = z.object({
    body: z.string().min(1, 'Please write a review').max(256, 'Review must be 256 characters or less'),
    rating: z.coerce.number().int().min(1, 'Please select a rating').max(5, 'Rating must be 5 or less'),
})