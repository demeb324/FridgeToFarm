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
            <h1 className={'text-3xl text-center font-bold my-8'}>Meals</h1>

            <div className="flex flex-row gap-8 justify-between mx-16">
                <div className="basis-1/3">
                    <form className="">
                        <h3 className="text-xl font-bold mb-4">Meals Selection:</h3>
                        <select id="items"
                                className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                            <option selected>Choose an item</option>
                            <option value="milk">Breakfast</option>
                            <option value="CA">Lunch</option>
                            <option value="FR">Dinner</option>
                            <option value="DE">Snack</option>
                        </select>
                    </form>
                </div>

                <div className="basis-1/3">
                    <form className="">
                        <h3 className="text-xl font-bold mb-4">Ingredients Selection:</h3>
                        <select id="items"
                                className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                            <option selected>Choose an item</option>
                            <option value="milk">Chicken</option>
                            <option value="CA">Beef</option>
                            <option value="FR">Pork</option>
                            <option value="DE">Vegetables</option>
                        </select>
                    </form>
                </div>

                <div className="basis-1/3">
                    <form className="">
                        <h3 className="text-xl font-bold mb-4">Cuisines Selection:</h3>
                        <select id="items"
                                className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                            <option selected>Choose an item</option>
                            <option value="milk">Mexican</option>
                            <option value="CA">Italian</option>
                            <option value="FR">Chinese</option>
                            <option value="DE">Indian</option>
                        </select>
                    </form>
                </div>

            </div>

            <button type="button"
                    className="mx-16 mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Next
            </button>

        <section className="mt-16">
            <h1 className="text-3xl text-center font-bold mb-8">Top Recommended Recipes</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-20">
                {recipes.map(recipe => <RecipeCard recipe={recipe}/>)}
            </div>
        </section>
        </>
    )
}