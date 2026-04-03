// import {FileInput, Label} from "flowbite-react";
// import {fileStorage, getStorageKey} from "~/utils/image-storage.server";
// import {GoogleGenAI} from "@google/genai";
// import * as process from "node:process";
// import {getAllRecipes, type Recipe} from "~/utils/models/recipe.model";
// import {RecipeCard} from "~/components/recipeCard";
import {data, redirect} from "react-router";
import {getAllIngredients, type Ingredient} from "~/utils/models/ingredient.model";
import type { Route } from "./+types/items-list";
import {commitSession, getSession} from "~/utils/session.server";
import {GoogleGenAI} from "@google/genai";
import {fileStorage, getStorageKey} from "~/utils/image-storage.server";
import {z} from "zod/v4";
import {zodResolver} from "@hookform/resolvers/zod";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";

export async function loader ({ params, request }:Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    if (!session.has("user") || !session.has("ingredients")) {
        redirect('/login')
    }
    const ingredientsDictionary = session.get('ingredients')
    if (!ingredientsDictionary) {
        return redirect('/login')
    }
    const ingredientsData: Ingredient[] = await getAllIngredients()
    if (ingredientsDictionary[params.id]) {
        return data({ingredients:ingredientsDictionary[params.id], ingredientsData},{

            })
    }
    console.log(ingredientsDictionary[params.id])
    // return data({ingredients:ingredientsDictionary[params.id], ingredientsData:[]},{

    // })
    console.log('Calling Gemini')
    const storageKey = getStorageKey(params.id);
    const file = await fileStorage.get(storageKey);

    if (!file) {
        throw new Response("User avatar not found", {
            status: 404,
        });
    }
    const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const streamedFile = await file.arrayBuffer()
    const base64ImageData = Buffer.from(streamedFile).toString("base64");
    const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
            responseMimeType: 'application/json'
        },
        contents: [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64ImageData,
                },
            },
            { text: "please give us a list of ingredients from the image and list the results as a clean JSON array of ingredients" }
        ],
    });
    // console.log(result.candidates[0].content);
    const resultText = result.text
    if (resultText === undefined) {
        throw new Response('Failed to get list of ingredients', {status:400})
    }
    console.log(JSON.parse(resultText))
    const ingredients = JSON.parse(resultText)
    ingredientsDictionary[params.id] = ingredients
    session.set("ingredients", ingredientsDictionary)
    const headers = new Headers()
    headers.append("Set-Cookie", await commitSession(session))
    return data({ingredients, ingredientsData},{
    headers
        })
}

const ItemsSchema = z.object({
    itemsList:z.array(z.string('please provide a valid ingredient name').min(1, "Please provide valid item name")).min(1, "Must provide at leas one ingredient")
})
const resolver = zodResolver(ItemsSchema)

type Items = z.infer<typeof ItemsSchema>
export async function action({request}: Route.ActionArgs){
    const {errors, data, receivedValues: defaultValues} = await getValidatedFormData<Items>(request, resolver)
    if (errors) {
        return {errors, defaultValues}
    }
}

export default function ItemsList({params, loaderData}: Route.ComponentProps) {
    const {ingredients, ingredientsData} = loaderData
    const defaultValue = {itemsList:ingredients}
    const {register, control, handleSubmit} = useRemixForm<Items> ({resolver:zodResolver(resolver)})
return (
    <>
        <div className="flex w-full items-center justify-center">
            <img src={`/api/image/${params.id}`} alt=""/>
        </div>
        <h2 className="mx-16 mb-4 font-bold text-2xl">
            List of items on the picture
        </h2>
        <div className="mx-16 text-left">
            <section className="mt-4">
                <div
                    className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-20">
                    <ul className="mx-16 list-none">
                    {ingredients.map((ingredient: string) => <li key={ingredient} className="text-lg">{ingredient}</li>)}
                    </ul>
                </div>
            </section>
        </div>

        <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
            Is this Everything? Add items:
        </h2>

        <ul className="mx-16 list-none">
            <li>salt</li>
            <li>cucumber</li>
        </ul>

        <div className="mx-16">
            <form className="pr-96">
                <select id="items"
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                    <option selected>Choose an item</option>
                    {ingredientsData.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.nameIng}</option>)}
                </select>
            </form>
            <button type="button"
                    className="mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Add
            </button>

        </div>
        <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
            What type of meal do you want to eat?
        </h2>
        <div className="mx-16">
            <form className="pr-96">
                <select id="items"
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                    <option selected>Choose an item</option>
                    <option value="milk">breakfast</option>
                    <option value="CA">lunch</option>
                    <option value="FR">dinner</option>
                    <option value="DE">desert</option>
                </select>
            </form>
        </div>
        <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
            What cuisines do you like to experience?
        </h2>
        <div className="mx-16">
            <form className="pr-96">
                <select id="items"
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                    <option selected>Choose an item</option>
                    <option value="milk">Chinese</option>
                    <option value="CA">Mexican</option>
                    <option value="FR">Middle Eastern</option>
                    <option value="DE">Barbeque</option>
                </select>
            </form>
            <button type="button"
                    className="mb-28 mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Next
            </button>
        </div>

    </>
)
}