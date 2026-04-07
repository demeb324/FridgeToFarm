// 2️⃣ Array of objects with validation rules
import {z} from "zod/v4";

const ingredientsArraySchema = z.array(
    z.object({

        name: z.string().min(1, "Name is required"),
        amount: z.number('please provide an amount of valid ingredients'),
        units: z.string('please provide an valid units').trim().max(16,"units must be 16 characters or less")

    })
).nonempty("At least one ingredients is required");


const instructionsArraySchema = z.array(
    z.object({

        stepNumber: z.number( 'Step is required'),
        instruction: z.string('please provide valid instruction').trim().max(255, "instructions must to be 255 characters or less"),
    })
).nonempty("At least one step is required");



export const recipeSchema = z.object({
    id: z.uuidv7('please provide a valid uuid for recipe id'),
    userId: z.uuidv7('please provide a valid uuid for user id'),
    calories: z.string('please provide valid content'),
    carbs: z.string('please provide valid content'),
    cookTime: z.string('please provide valid content'),
    cuisine: z.string('please provide valid content'),
    fatContent: z.string('please provide valid content'),
    imageUrl: z.url('please provide a valid image url')
        .max(255, 'image url cannot exceed 255 characters')
        .trim()
        .nullable(),
    instructions: instructionsArraySchema,
    ingredients: ingredientsArraySchema,
    mealCategory: z.string('please provide a valid meal Category'),
    prepTime: z.string('please provide valid prep time'),
    protein: z.string('please provide valid content'),
    servings: z.int('please provide valid servings'),
    title: z.string('please provide valid title'),
    totalTime: z.string('please provide valid total time'),
})
export type Recipe = z.infer<typeof recipeSchema>

export async function getRecipesByCuisineAndMealCategory(
    cuisine: string,
    mealCategory: string
): Promise<Recipe[]> {
    const url = new URL(`${process.env.REST_API_URL}/recipe/cuisine-and-meal-category/${encodeURIComponent(cuisine)}/${encodeURIComponent(mealCategory)}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch recipes: ${response.statusText}`)
    const data = await response.json()
    return data.data as Recipe[]
}

export async function getAllRecipes(): Promise<Recipe[]> {
    const url = new URL(`${process.env.REST_API_URL}/recipe`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch recipes: ${response.statusText}`)
    const data = await response.json()

    const recipes = data.data as Recipe[]



    return recipes
}

