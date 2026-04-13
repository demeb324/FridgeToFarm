import {Rating, RatingStar} from "flowbite-react";
import type {Review} from "~/utils/models/review.model";

export function RecipeRating(props: {reviews: Review[]}) {

    const {reviews} = props
    let average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating , 0) / reviews.length : 0
    average = Math.round(average * 10) / 10
    const filledStars = Math.round(average)
    const emptyStars = 5 - filledStars

    return (
        <Rating>
            {Array.from({length: filledStars}, (_, i) => (
                <RatingStar key={`filled-${i}`} filled />
            ))}
            {Array.from({length: emptyStars}, (_, i) => (
                <RatingStar key={`empty-${i}`} filled={false} />
            ))}
            {reviews.length > 0 && (
                <p className="ml-2 text-sm font-bold text-gray-900 dark:text-white">{average}</p>
            )}
            <span className="mx-1.5 h-1 w-1 rounded-full bg-gray-500 dark:bg-gray-400" />
            <a href="#" className="text-sm font-medium text-gray-900 underline hover:no-underline dark:text-white">
                {reviews.length} reviews
            </a>
        </Rating>
    );
}