import {z} from "zod/v4";
import {sql} from "../../utils/database.utils.ts";


// 2️⃣ Array of objects with validation rules
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
    fatContent: z.string('please provide valid content'),
    imageUrl: z.url('please provide a valid image url')
        .max(255, 'image url cannot exceed 255 characters')
        .trim()
        .nullable(),
    instructions: z.json('please provide valid instructions'),
    ingredients: ingredientsArraySchema,
    prepTime: z.string('please provide valid prep time'),
    protein: z.string('please provide valid content'),
    servings: z.string('please provide valid servings'),
    title: z.string('please provide valid title'),
    totalTime: z.string('please provide valid total time'),
})
export type Recipe = z.infer<typeof recipeSchema>
export async function insertRecipe(recipe: Recipe): Promise<string> {
    // Validate the recipe object against the RecipeSchema
    recipeSchema.parse(recipe)

    await sql`INSERT INTO recipe (id, user_id, calories, carbs, cook_time, fat_content, image_url, instructions, ingredients, prep_time, protein, servings, title, total_time)
    VALUES (${recipe.id}, ${recipe.userId}, ${recipe.calories}, ${recipe.carbs},
     ${recipe.cookTime}, ${recipe.fatContent}, ${recipe.imageUrl}, ${recipe.instructions}, ${recipe.ingredients}, ${recipe.prepTime}, ${recipe.protein}, ${recipe.servings}, ${recipe.title}, ${recipe.totalTime})`
    return 'recipe successfully created'
}
