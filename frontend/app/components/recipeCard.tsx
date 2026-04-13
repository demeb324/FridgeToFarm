import {RecipeRating} from "~/components/recipe-rating";
import type {Recipe} from "~/utils/models/recipe.model";
import type {Review} from "~/utils/models/review.model";
import {Link} from "react-router";

export function RecipeCard(props: {recipe: Recipe, reviews: Review[]}) {
    const {recipe, reviews} = props

    return (
        <>

<<<<<<< HEAD
            <div className="flex flex-col">
                <div className="w-full max-w-[240px]">
=======
            <Link to={`/recipe/${recipe.id}`} className="md:mx-0 mx-16 flex flex-col hover:opacity-80 transition-opacity">
                <div className="md:mx-0 w-60 mx-16">
>>>>>>> reviewrecipe
                    <img className="mb-2" src={recipe.imageUrl ?? "./public/image400.png"} alt={recipe.title}/>
                </div>
                <p className="p-4 text-center">{recipe.title}</p>
                <div className="flex justify-center w-full mb-8">
                    <RecipeRating reviews={reviews}/>
                </div>
            </Link>

        </>
    )
}
