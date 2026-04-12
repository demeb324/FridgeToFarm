import {RecipeRating} from "~/components/recipe-rating";
import type {Recipe} from "~/utils/models/recipe.model";
import type {Review} from "~/utils/models/review.model";

export function RecipeCard(props: {recipe: Recipe, reviews: Review[]}) {
    const {recipe, reviews} = props

    return (
        <>

            <div className="flex flex-col">
                <div className="w-full max-w-[240px]">
                    <img className="mb-2" src={recipe.imageUrl ?? "./public/image400.png"} alt={recipe.title}/>
                </div>
                <p className="p-4 text-center">{recipe.title}</p>
                <div className="flex justify-center w-full mb-8">
                    <RecipeRating reviews={reviews}/>
                </div>
            </div>

        </>
    )
}
