import {data, redirect, useNavigate} from "react-router";
import {getAllIngredients, type Ingredient} from "~/utils/models/ingredient.model";
import type { Route } from "./+types/items-list";
import {getSession} from "~/utils/session.server";
import {GoogleGenAI} from "@google/genai";
import {fileStorage, getStorageKey} from "~/utils/image-storage.server";
import {z} from "zod/v4";
import {zodResolver} from "@hookform/resolvers/zod";
import {useRemixForm} from "remix-hook-form";
import {useFieldArray} from "react-hook-form";
import {useState, useEffect} from "react";

// Prevent the loader from re-running when we update URL params reactively
export function shouldRevalidate({ currentUrl, nextUrl }: Route.ShouldRevalidateFunctionArgs) {
    return currentUrl.pathname !== nextUrl.pathname
}

export async function loader ({ params, request }:Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    if (!session.has("user")) {
        const { pathname, search } = new URL(request.url)
        return redirect(`/login?redirectTo=${encodeURIComponent(pathname + search)}`)
    }

    const requestUrl = new URL(request.url)
    const ingredientsFromUrl = requestUrl.searchParams.getAll('ingredients')
    const ingredientsData: Ingredient[] = await getAllIngredients()

    if (ingredientsFromUrl.length > 0) {
        const mealType = requestUrl.searchParams.get('mealType') ?? ''
        const cuisine = requestUrl.searchParams.get('cuisine') ?? ''
        return data({ ingredients: ingredientsFromUrl, ingredientsData, mealType, cuisine })
    }

    const storageKey = getStorageKey(params.id);
    console.log('[loader] looking up storage key:', storageKey)
    const file = await fileStorage.get(storageKey);
    console.log('[loader] file found:', !!file)

    if (!file) {
        throw new Response("Image not found", { status: 404 });
    }
    console.log('Calling Gemini')

    const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const base64ImageData = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: { responseMimeType: 'application/json' },
        contents: [
            { inlineData: { mimeType: file.type, data: base64ImageData } },
            { text: "please give us a list of ingredients from the image and list the results as a clean JSON array of ingredients" }
        ],
    });

    const resultText = result.text
    if (!resultText) {
        throw new Response('Failed to get list of ingredients', { status: 400 })
    }

    const ingredients: string[] = JSON.parse(resultText)
    const redirectUrl = new URL(request.url)
    ingredients.forEach(i => redirectUrl.searchParams.append('ingredients', i))
    return redirect(redirectUrl.toString())
}

const ItemsSchema = z.object({
    ingredients: z.array(z.object({ value: z.string().min(1, "Ingredient cannot be empty") })).min(1, "Must have at least one ingredient"),
    mealType: z.string().min(1, "Please select a meal type"),
    cuisine: z.string().min(1, "Please select a cuisine"),
})
const resolver = zodResolver(ItemsSchema)

type Items = z.infer<typeof ItemsSchema>


export default function ItemsList({params, loaderData}: Route.ComponentProps) {
    const {ingredients, ingredientsData, mealType, cuisine} = loaderData

    const navigate = useNavigate()

    const { register, control, handleSubmit, watch, formState: { errors } } = useRemixForm<Items>({
        resolver,
        defaultValues: {
            ingredients: ingredients.map((name: string) => ({ value: name })),
            mealType,
            cuisine,
        },
        submitHandlers: {
            onValid: (data) => {
                const confirmedParams = new URLSearchParams()
                data.ingredients.forEach(i => confirmedParams.append('ingredients', i.value))
                confirmedParams.set('mealType', data.mealType)
                confirmedParams.set('cuisine', data.cuisine)
                navigate(`/recipe-generation?${confirmedParams.toString()}`)
            }
        }
    })
    const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

    // Keep the URL in sync with form state so browser Back restores the user's input
    useEffect(() => {
        const subscription = watch((values) => {
            const { ingredients: ing, mealType: mt, cuisine: cu } = values
            if (!ing?.length) return
            const urlParams = new URLSearchParams()
            ing.forEach(i => { if (i?.value) urlParams.append('ingredients', i.value) })
            if (mt) urlParams.set('mealType', mt)
            if (cu) urlParams.set('cuisine', cu)
            navigate(`/items-list/${params.id}?${urlParams.toString()}`, { replace: true, preventScrollReset: true })
        })
        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const [selectValue, setSelectValue] = useState('')
    const [freeText, setFreeText] = useState('')

    return (
        <>
            <div className="flex w-full items-center justify-center">
                <img src={`/api/image/${params.id}`} alt=""/>
            </div>

            <form onSubmit={handleSubmit}>
                <h2 className="mx-16 mb-4 font-bold text-2xl">
                    List of items on the picture
                </h2>
                <div className="mx-16 text-left">
                    <ul className="list-none">
                        {fields.map((field, index) => (
                            <li key={field.id} className="flex items-center gap-2 text-lg py-1">
                                <input type="hidden" {...register(`ingredients.${index}.value`)} />
                                <span>{field.value}</span>
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-500 hover:text-red-700 font-bold leading-none"
                                    aria-label={`Remove ${field.value}`}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                    {errors.ingredients && (
                        <p className="text-red-500 text-sm mt-1">{errors.ingredients.message}</p>
                    )}
                </div>

                <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
                    Is this Everything? Add items:
                </h2>

                <div className="mx-16 pr-96 space-y-4">
                    <div className="flex gap-2 items-end">
                        <select
                            value={selectValue}
                            onChange={(e) => setSelectValue(e.target.value)}
                            className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs"
                        >
                            <option value="">Choose an item</option>
                            {ingredientsData.map((ingredient: Ingredient) => (
                                <option key={ingredient.id} value={ingredient.nameIng}>
                                    {ingredient.nameIng}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectValue && !fields.some(f => f.value === selectValue)) {
                                    append({ value: selectValue })
                                    setSelectValue('')
                                }
                            }}
                            className="text-white bg-blue-600 border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none whitespace-nowrap"
                        >
                            Add
                        </button>
                    </div>

                    <div className="flex gap-2 items-end">
                        <input
                            type="text"
                            value={freeText}
                            onChange={(e) => setFreeText(e.target.value)}
                            placeholder="Type an ingredient not in the list..."
                            className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const trimmed = freeText.trim()
                                if (trimmed && !fields.some(f => f.value === trimmed)) {
                                    append({ value: trimmed })
                                    setFreeText('')
                                }
                            }}
                            className="text-white bg-blue-600 border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none whitespace-nowrap"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
                    What type of meal do you want to eat?
                </h2>
                <div className="mx-16 pr-96">
                    <select
                        {...register('mealType')}
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                    >
                        <option value="">Choose a meal type</option>
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="desert">Desert</option>
                    </select>
                    {errors.mealType && (
                        <p className="text-red-500 text-sm mt-1">{errors.mealType.message}</p>
                    )}
                </div>

                <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
                    What cuisines do you like to experience?
                </h2>
                <div className="mx-16 pr-96">
                    <select
                        {...register('cuisine')}
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                    >
                        <option value="">Choose a cuisine</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Mexican">Mexican</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Barbeque">Barbeque</option>
                    </select>
                    {errors.cuisine && (
                        <p className="text-red-500 text-sm mt-1">{errors.cuisine.message}</p>
                    )}
                </div>

                <div className="mx-16 mb-28 mt-6">
                    <button
                        type="submit"
                        className="text-white bg-blue-600 border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
                    >
                        Next
                    </button>
                </div>
            </form>
        </>
    )
}

