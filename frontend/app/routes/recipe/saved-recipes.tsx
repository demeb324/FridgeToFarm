import {FileInput, Label} from "flowbite-react";
import {RecipeCard} from "~/components/recipeCard";
import {Route} from "react-router";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}
type Recipe = { image: string, name: string, stars: number }
export default function Home() {
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

return(
      <>
          <h2 className={'text-3xl text-center mt-16 font-bold mb-8'}>Saved Recipes</h2>

          <section className="mt-16">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-8 md:gap-16 justify-items-center md:container md:mx-auto mx-4">
                  {recipes.map(recipe => <RecipeCard recipe={recipe}/>)}
              </div>
          </section>
      </>
  )
}