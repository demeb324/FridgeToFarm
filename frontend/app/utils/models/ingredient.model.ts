import {z} from "zod/v4";
import {id} from "zod/locales";

export const ingredientSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id'),
    nameIng: z.string('please provide a valid ingredient name')
})

export type Ingredient = z.infer<typeof ingredientSchema>

export async function getAllIngredients(): Promise<Ingredient[]> {
    const url = new URL(`${process.env.REST_API_URL}/ingredients`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch ingredients: ${response.statusText}`)
    const data = await response.json()

    const ingredients = data.data as Ingredient[]

    return ingredients
}