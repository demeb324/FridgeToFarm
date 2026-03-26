import {Rating, RatingStar} from "flowbite-react";
import type {Review} from "~/utils/models/review.model";

export function RecipeRating(props: {reviews: Review[]}) {

    const {reviews} = props
    let average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating , 0) / reviews.length : 0
    average = Math.round(average * 10) / 10
    const numberOfStars = reviews.length ? new Array(Math.round(average)).fill(1) : []

    return (
        <Rating>
            {numberOfStars.map((element, index)=>     <RatingStar key={index} />  )}
            {reviews.length ?  <p className="ml-2 text-sm font-bold text-gray-900 dark:text-white">{average}</p> : ""  }
            <span className="mx-1.5 h-1 w-1 rounded-full bg-gray-500 dark:bg-gray-400" />
            <a href="#" className="text-sm font-medium text-gray-900 underline hover:no-underline dark:text-white">
                {reviews.length} reviews
            </a>
        </Rating>
    );
}