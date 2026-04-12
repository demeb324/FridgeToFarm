import type {Route} from "./+types/meals"
import {RecipeCard} from "~/components/recipeCard";
import {getAllRecipes} from "~/utils/models/recipe.model";
import {getRecipeReviews} from "~/utils/models/review.model";
import type {Recipe} from "~/utils/models/recipe.model";
import {Form, useSearchParams} from "react-router";

export async function loader({request}: Route.LoaderArgs) {
    const url = new URL(request.url)
    const mealCategory = url.searchParams.get("mealCategory") ?? ""
    const cuisine = url.searchParams.get("cuisine") ?? ""
    const ingredient = url.searchParams.get("ingredient") ?? ""

    let recipes: Recipe[] = await getAllRecipes()

    if (mealCategory) {
        recipes = recipes.filter(r => r.mealCategory.toLowerCase() === mealCategory.toLowerCase())
    }
    if (cuisine) {
        recipes = recipes.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase())
    }
    if (ingredient) {
        recipes = recipes.filter(r =>
            r.ingredients.some(i => i.name.toLowerCase().includes(ingredient.toLowerCase()))
        )
    }

    const reviewsMap = await getRecipeReviews(recipes)
    const reviews = Object.fromEntries(reviewsMap)
    return {recipes, reviews}
}

export default function Meals({loaderData}: Route.ComponentProps) {
    const {recipes, reviews} = loaderData
    const [searchParams] = useSearchParams()

    return (
        <>
            <h1 className="text-3xl text-center font-bold my-8">Meals</h1>

            <Form method="get" className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 items-end mx-auto px-4 md:px-16 max-w-5xl">
                <div>
                    <h3 className="text-xl font-bold mb-4">Meals Selection:</h3>
                    <select
                        name="mealCategory"
                        defaultValue={searchParams.get("mealCategory") ?? ""}
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                        <option value="">All meals</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Snack">Snack</option>
                    </select>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4">Ingredients Selection:</h3>
                    <select
                        name="ingredient"
                        defaultValue={searchParams.get("ingredient") ?? ""}
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                        <option value="">All ingredients</option>
                        <option value="Chicken">Chicken</option>
                        <option value="Beef">Beef</option>
                        <option value="Pork">Pork</option>
                        <option value="Vegetables">Vegetables</option>
                    </select>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4">Cuisines Selection:</h3>
                    <select
                        name="cuisine"
                        defaultValue={searchParams.get("cuisine") ?? ""}
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                        <option value="">All cuisines</option>
                        <option value="Mexican">Mexican</option>
                        <option value="Italian">Italian</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Indian">Indian</option>
                    </select>
                </div>
                <div className="flex items-end pb-0.5">
                    <button
                        type="submit"
                        className="mt-4 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                        Search
                    </button>
                </div>
            </Form>

            <section className="mt-16">
                <h1 className="text-3xl text-center font-bold mb-8">
                    {recipes.length > 0 ? "Recommended Recipes" : "No recipes found"}
                </h1>
                <div
                    className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-8 md:gap-16 justify-items-center md:container md:mx-auto mx-4">
                    {recipes.map((recipe: Recipe) => (
                        <RecipeCard recipe={recipe} key={recipe.id} reviews={reviews[recipe.id] ?? []}/>
                    ))}
                </div>
            </section>
        </>
    )
}
