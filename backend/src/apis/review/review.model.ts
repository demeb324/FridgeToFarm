import {z} from 'zod/v4'
import {sql} from '../../utils/database.utils.ts'

/**
 * Schema for validating thread objects
 * @shape id: string the primary key for the thread
 * @shape profileId: string the foreign key to the profile that created the thread
 * @shape replyThreadId: string | null the foreign key to the thread being replied to
 * @shape content: string the content of the thread (max 140 characters)
 * @shape datetime: Date the timestamp when the thread was created
 * @shape imageUrl: string | null optional image URL for the thread
 */

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

/**
 * Insert a new review into the database
 * @param review the review object to insert
 * @returns "Thread successfully created"
 */

export async function insertReview(review: Review): Promise<string> {
    // Validate the Review object against the ReviewSchema
    ReviewSchema.parse(review)

    await sql`
         INSERT INTO review (recipe_id,user_id, body, created_at, rating) 
         VALUES (${review.recipeId}, ${review.userId}, ${review.body}, now(), ${review.rating})`

    return 'review successfully created'
}

export async function selectReviewByRecipeId(recipeId:string): Promise<Review[]> {
    const rowList = await sql`
SELECT rv.recipe_id, rv.user_id, rv.body, rv.created_at, rv.rating, u.username
FROM review rv
JOIN "user" u ON rv.user_id = u.id
WHERE rv.recipe_id = ${recipeId}
ORDER BY rv.created_at DESC
       `
    // Enforce that the result is an array of one review, or null
    return ReviewSchema.array().parse(rowList)

}

export async function selectReviewByPrimaryKey(recipeId:string, userId:string): Promise<Review | null> {
    const rowList = await sql`
SELECT recipe_id, user_id, body, created_at, rating
FROM review 
WHERE recipe_id = ${recipeId} AND user_id = ${userId}
       `
    // Enforce that the result is an array of one review, or null
    const result = ReviewSchema.array().max(1).parse(rowList)
    return result[0] ?? null

}

/** select recent reviews from profiles that the given profile is following
// * Select recent reviews from profiles that the given profile is following
// * @param UserId the id of the profile whose following list to check
// * @param limit the maximum number of threads to return (default 50)
// * @returns array of review
// */

export async function deleteReview(recipeId:string, userId:string): Promise<string> {
    const rowList = await sql`
DELETE FROM review
WHERE recipe_id = ${recipeId} AND user_id = ${userId}
`
    return 'review successfully deleted'
}