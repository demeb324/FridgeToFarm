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
export async function insertRecipe(recipe: Recipe): Promise<string> {
    // Validate the recipe object against the RecipeSchema
    recipeSchema.parse(recipe)

    await sql`INSERT INTO recipe (id, user_id, calories, carbs, cook_time, cuisine, fat_content, image_url, instructions, ingredients, meal_category, prep_time, protein, servings, title, total_time)
    VALUES (${recipe.id}, ${recipe.userId}, ${recipe.calories}, ${recipe.carbs},
     ${recipe.cookTime}, ${recipe.cuisine}, ${recipe.fatContent}, ${recipe.imageUrl}, ${sql.json(recipe.instructions)}, ${sql.json(recipe.ingredients)}, ${recipe.mealCategory}, ${recipe.prepTime}, ${recipe.protein}, ${recipe.servings}, ${recipe.title}, ${recipe.totalTime})`
    return 'recipe successfully created'
}

export async function selectRecipeById(id: string): Promise<Recipe | null> {
    const rowList = await sql`
        SELECT id, user_id, calories, carbs, cook_time, cuisine, fat_content, image_url, instructions, ingredients, meal_category, prep_time, protein, servings, title, total_time
        FROM recipe
        WHERE id = ${id}`
    
    // Parse JSONB columns from database (postgres library returns them as objects)
    const parsedRows = rowList.map((row: any) => ({
        ...row,
        instructions: JSON.parse(row.instructions),
        ingredients: JSON.parse(row.ingredients)
    }))
    
    // Enforce that the result is an array of one recipe, or null
    const result = recipeSchema.array().max(1).parse(parsedRows)
    return result[0] ?? null
}

export async function selectRecipeByCuisineAndMealCategory(cuisine: string, mealCategory: string): Promise<Recipe[]> {
    
    const rowList = await sql`
        SELECT id, user_id, calories, carbs, cook_time, cuisine, fat_content, image_url, instructions, ingredients, meal_category, prep_time, protein, servings, title, total_time
        FROM recipe
        WHERE LOWER(cuisine) = LOWER(${cuisine}) AND LOWER(meal_category) = LOWER(${mealCategory})`



    // Enforce that the result is an array of one recipe, or null
    return recipeSchema.array().parse(rowList)
}

export async function selectRecipesByUserId(userId: string): Promise<Recipe[]> {
    const rowList = await sql`SELECT id, user_id, calories, carbs, cook_time, cuisine, fat_content, image_url, instructions, ingredients, meal_category, prep_time, protein, servings, title, total_time
        FROM recipe
        WHERE user_id = ${userId}`

    // Parse JSONB columns from database (postgres library returns them as objects)
    const parsedRows = rowList.map((row: any) => ({
        ...row,
        instructions: JSON.parse(row.instructions),
        ingredients: JSON.parse(row.ingredients)
    }))

    // Enforce that the result is an array of one recipe, or null
    return recipeSchema.array().parse(parsedRows)

}

export async function selectRecipesByIngredient(ingredient: string): Promise<Recipe[]> {

    const searchBy = [{name: ingredient}]
    const rowList = await sql`SELECT id, user_id, calories, carbs, cook_time, cuisine, fat_content, image_url, instructions, ingredients, meal_category, prep_time, protein, servings, title, total_time
        FROM recipe
        WHERE ingredients @> ${sql.json(searchBy)}
        `


    // Enforce that the result is an array of one recipe, or null
    return recipeSchema.array().parse(rowList)
    }




export async function selectAllRecipes(): Promise<Recipe[]> {
    const rowList = await sql`SELECT id, user_id, calories, carbs, cook_time, cuisine, fat_content, image_url, instructions, ingredients, meal_category, prep_time, protein, servings, title, total_time
        FROM recipe
        `

    // Enforce that the result is an array of one recipe, or null
    return recipeSchema.array().parse(rowList)

}