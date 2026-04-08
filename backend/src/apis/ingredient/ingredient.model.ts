import {z} from "zod/v4";
import {sql} from "../../utils/database.utils.ts";

export const ingredientSchema = z.object({
    id: z.uuidv7('please provide a valid uuid for ingredient'),
    nameIng: z.string('please provide a valid ingredient name')
})

export type Ingredient = z.infer<typeof ingredientSchema>
export async function insertIngredient(ingredient: Ingredient): Promise<string> {
    ingredientSchema.parse(ingredient)

    await sql `INSERT INTO ingredient (id, name_ing)
    VALUES (${ingredient.id}, ${ingredient.nameIng})`
    return 'Ingredient successfully created'

}

export async function selectAllIngredients(): Promise<Ingredient[]> {
    const rowList = await sql`SELECT id, name_ing FROM ingredient`

    return ingredientSchema.array().parse(rowList)
}