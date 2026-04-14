import {data, redirect, useNavigate} from "react-router";
import {getAllIngredients, type Ingredient} from "~/utils/models/ingredient.model";
import type { Route } from "./+types/items-list";
import {getSession} from "~/utils/session.server";
import Anthropic from "@anthropic-ai/sdk";
import {fileStorage, getStorageKey} from "~/utils/image-storage.server";
import {z} from "zod/v4";
import {zodResolver} from "@hookform/resolvers/zod";
import {useRemixForm} from "remix-hook-form";
import {useFieldArray} from "react-hook-form";
import {useState, useEffect} from "react";

function extractJson(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    return match ? match[1] : text.trim()
}

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
    const file = await fileStorage.get(storageKey);

    if (!file) {
        throw new Response("Image not found", { status: 404 });
    }

    const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY})
    const base64ImageData = Buffer.from(await file.arrayBuffer()).toString("base64")
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: "Respond only with a valid JSON array of ingredient name strings. No markdown, no explanation.",
        messages: [{
            role: "user",
            content: [
                {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                        data: base64ImageData
                    }
                },
                {type: "text", text: "List all ingredients you can see in this fridge photo as a JSON array of strings."}
            ]
        }]
    })

    const resultText = response.content[0].type === 'text' ? response.content[0].text : null
    if (!resultText) {
        throw new Response('Failed to get list of ingredients', { status: 400 })
    }

    const ingredients: string[] = JSON.parse(extractJson(resultText))
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

const inputClass = "block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

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
    const [search, setSearch] = useState('')
    const [showAddPanel, setShowAddPanel] = useState(false)

    // Filter display list — removal uses stable field.id to find the real index
    const filteredFields = fields.filter(f =>
        f.value.toLowerCase().includes(search.toLowerCase())
    )

    const uploadedDate = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    return (
        <form onSubmit={handleSubmit}>
            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My fridge</h1>
                        <p className="text-sm text-gray-500 mt-1">Ingredients detected from your photo. Review, edit, then find recipes.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowAddPanel(v => !v)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            + Add item
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                        >
                            Find recipes <span aria-hidden>↗</span>
                        </button>
                    </div>
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="border border-gray-200 rounded-xl px-4 py-4 bg-white">
                        <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Items detected</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl px-4 py-4 bg-white">
                        <p className="text-2xl font-bold text-gray-900">{uploadedDate}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Photo uploaded</p>
                        <p className="text-xs text-gray-400">just now</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl px-4 py-4 bg-white">
                        <p className="text-2xl font-bold text-gray-400">—</p>
                        <p className="text-xs text-gray-500 mt-0.5">Recipe matches</p>
                        <p className="text-xs text-gray-400">click Find recipes</p>
                    </div>
                </div>

                {/* ── Photo banner ── */}
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center gap-4 mb-6">
                    <img
                        src={`/api/image/${params.id}`}
                        alt="Uploaded fridge photo"
                        className="h-16 w-16 rounded-lg object-cover shrink-0 border border-emerald-200"
                    />
                    <div>
                        <p className="text-sm font-medium text-gray-800">Your fridge photo</p>
                        <p className="text-xs text-gray-500 mt-0.5">AI scanned · {fields.length} ingredient{fields.length !== 1 ? 's' : ''} identified</p>
                    </div>
                </div>

                {/* ── Search ── */}
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search ingredients..."
                    className={inputClass}
                />

                {/* ── Ingredient list ── */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                            Detected ingredients · {fields.length}
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowAddPanel(v => !v)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                            + add
                        </button>
                    </div>

                    {/* Add panel */}
                    {showAddPanel && (
                        <div className="border border-gray-200 rounded-xl p-4 mb-3 space-y-3 bg-gray-50">
                            <div className="flex gap-2">
                                <select
                                    value={selectValue}
                                    onChange={e => setSelectValue(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Choose from list…</option>
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
                                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={freeText}
                                    onChange={e => setFreeText(e.target.value)}
                                    placeholder="Type an ingredient…"
                                    className={inputClass}
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
                                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Hidden inputs for ALL fields so form submission is complete */}
                    {fields.map((field, index) => (
                        <input key={field.id} type="hidden" {...register(`ingredients.${index}.value`)} />
                    ))}

                    {/* Visible rows — filtered */}
                    {filteredFields.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {filteredFields.map(field => {
                                const realIndex = fields.findIndex(f => f.id === field.id)
                                return (
                                    <div key={field.id} className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                                        <span className="text-base shrink-0" aria-hidden>🥗</span>
                                        <span className="flex-1 text-sm font-medium text-gray-800 capitalize truncate">{field.value}</span>
                                        <button
                                            type="button"
                                            onClick={() => remove(realIndex)}
                                            aria-label={`Remove ${field.value}`}
                                            className="w-5 h-5 rounded-full border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 flex items-center justify-center text-xs transition-colors shrink-0"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-gray-400 py-8 border border-gray-200 rounded-xl">
                            {search ? 'No ingredients match your search.' : 'No ingredients yet.'}
                        </p>
                    )}

                    {errors.ingredients && (
                        <p className="text-red-500 text-sm mt-2">{errors.ingredients.message}</p>
                    )}
                </div>

                {/* ── Meal preferences ── */}
                <div className="mt-8 border border-gray-200 rounded-xl p-5 bg-white">
                    <p className="text-sm font-semibold text-gray-800 mb-4">Meal preferences</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Meal type</label>
                            <select {...register('mealType')} className={inputClass}>
                                <option value="">Choose a meal type</option>
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="desert">Dessert</option>
                            </select>
                            {errors.mealType && (
                                <p className="text-red-500 text-xs mt-1">{errors.mealType.message}</p>
                            )}
                        </div>
                        <div>
                            <label className={labelClass}>Cuisine</label>
                            <select {...register('cuisine')} className={inputClass}>
                                <option value="">Choose a cuisine</option>
                                <option value="Chinese">Chinese</option>
                                <option value="Mexican">Mexican</option>
                                <option value="Middle Eastern">Middle Eastern</option>
                                <option value="Barbeque">Barbeque</option>
                            </select>
                            {errors.cuisine && (
                                <p className="text-red-500 text-xs mt-1">{errors.cuisine.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Bottom CTA ── */}
                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                        Find recipes <span aria-hidden>↗</span>
                    </button>
                </div>

            </div>
        </form>
    )
}
