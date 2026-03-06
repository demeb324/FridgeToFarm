import React from 'react';
import {Link} from "react-router";
import {RecipeCard} from "~/components/recipeCard";


export default function FriendProfile() {

    const lastCookedRecipes = [
        {image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3},
        {image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 4},
        {image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 2},
        {image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 5},
        {image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3},
    ]
    return (


        <div className="min-h-screen p-8">

            <div className="flex gap-8 p-4 mb-8">

                <Link className="underline text-xl px-4" to="/friends/add">Add Friend</Link>
                <Link className="underline text-xl px-4" to="/friends/my-friends">My Friends</Link>
            </div>

            <h2 className="mb-4 font-bold text-3xl">Perla: </h2>

            <div className="flex gap-8 p-4 mb-16">

                <div className=" w-32 h-32 border border-black flex items-center justify-center">
                    Picture
                </div>

                <div className=" flex flex-col gap-4">
                    <button className=" bg-blue-400 text-white px-6 py-2 rounded">Send Message</button>
                    <button className=" bg-blue-400 text-white px-6 py-2 rounded">Remove Friend</button>
                </div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-8">Perla's Favorite Recipes</h2>

            <section className="mb-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mx-8">
                    <RecipeCard recipe={{image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3}}/>
                    <RecipeCard recipe={{image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3}}/>
                    <RecipeCard recipe={{image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3}}/>
                    <RecipeCard recipe={{image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3}}/>
                    <RecipeCard recipe={{image: "/image400.png", name: "Chef John's Italian Meatballs", stars: 3}}/>
                </div>

                {/*drop menu*/}

                <div className="flex justify-end mt-8 mr-8">
                    <select className="border border-gray-300 rounded px-4 py-2">
                        <option>Sort by</option>
                        <option>Latest</option>
                        <option>Popular</option>
                        <option>Oldest</option>
                    </select>
                </div>
            </section>
            <h2 className="text-3xl font-bold text-center mb-8">Perla's Last Cooked Recipes</h2>

            <section className="mb-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mx-8">
                    {lastCookedRecipes.map(recipe => <RecipeCard recipe={recipe}/>)}
                </div>

                <div className="flex justify-end mt-8 mr-8">
                    <select className="border border-gray-300 rounded px-4 py-2">
                        <option>Sort by</option>
                        <option>Latest</option>
                        <option>Popular</option>
                        <option>Oldest</option>
                    </select>
                </div>
            </section>

        </div>
    );
}