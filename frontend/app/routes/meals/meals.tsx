import {RecipeCard} from "~/components/recipeCard";

type Recipe = { image: string, name: string, stars: number }

export default function Meals() {
    const allRecipes: Recipe[] = [
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 4},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 3},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 5},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 1},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 5},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 5},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 5},
        {image: "/image400.png", name: "Recipe name this recipe is amazing", stars: 5},
    ]
    const recipes = allRecipes.slice(0, 8)
return (
        <>
        <section className="mt-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-20">
                {recipes.map(recipe => <RecipeCard recipe={recipe}/>)}
            </div>
        </section>
        </>
    )
}