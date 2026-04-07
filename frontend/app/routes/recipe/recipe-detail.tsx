import {getRecipeById} from "~/utils/models/recipe.model";
import type {Route} from "./+types/recipe-detail";

export async function loader({params}: Route.LoaderArgs) {
    const recipe = await getRecipeById(params.id)
    if (!recipe) throw new Response("Recipe not found", {status: 404})
    return {recipe}
}

export default function RecipeDetail({loaderData}: Route.ComponentProps) {
    const {recipe} = loaderData

    return (
        <div className="max-w-3xl mx-auto px-8 py-16 mb-28">
            <h1 className="font-bold text-3xl mb-2">{recipe.title}</h1>
            <p className="text-body text-sm mb-8">{recipe.cuisine} · {recipe.mealCategory}</p>

            <div className="flex gap-8 mb-10 text-center">
                <div>
                    <p className="font-semibold text-lg">{recipe.prepTime}</p>
                    <p className="text-body text-sm">Prep</p>
                </div>
                <div>
                    <p className="font-semibold text-lg">{recipe.cookTime}</p>
                    <p className="text-body text-sm">Cook</p>
                </div>
                <div>
                    <p className="font-semibold text-lg">{recipe.totalTime}</p>
                    <p className="text-body text-sm">Total</p>
                </div>
                <div>
                    <p className="font-semibold text-lg">{recipe.servings}</p>
                    <p className="text-body text-sm">Servings</p>
                </div>
            </div>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Ingredients</h2>
                <ul className="list-disc list-inside space-y-1">
                    {recipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-body">
                            {ing.amount} {ing.units} {ing.name}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="font-bold text-2xl mb-4">Instructions</h2>
                <ol className="space-y-6">
                    {recipe.instructions.map((step) => (
                        <li key={step.stepNumber} className="flex gap-4">
                            <span className="font-bold text-blue-600 text-lg w-6 shrink-0">{step.stepNumber}</span>
                            <p className="text-body">{step.instruction}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section>
                <h2 className="font-bold text-2xl mb-4">Nutrition Facts <span className="text-sm font-normal text-body">per serving</span></h2>
                <div className="flex gap-8">
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.calories}</p>
                        <p className="text-body text-sm">Calories</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.fatContent}</p>
                        <p className="text-body text-sm">Fat</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.carbs}</p>
                        <p className="text-body text-sm">Carbs</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xl">{recipe.protein}</p>
                        <p className="text-body text-sm">Protein</p>
                    </div>
                </div>
            </section>
        </div>
    )
}
