import { AddFriend } from "~/components/AddFriend";
import React from 'react';
import {Link} from "react-router";
import {FriendCard} from "~/components/friendcard";
import {FriendRequestCard} from "~/components/friendrequest";
// from martin
type Friend = { image: string, name: string }
type FriendRequest = { image: string, name: string }

export default function allFriends () {
    // martin code

    const allfriends: Friend[] = [
        {image: "/image400.png", name: "Ben Smith1" },
        {image: "/image400.png", name: "Martin Smith2" },
        {image: "/image400.png", name: "Perla Smiths3" },
        {image: "/image400.png", name: "George smiths4" },

    ]
    const friendrequest: FriendRequest[] = [
        {image: "/image400.png", name: "Ben Smith1" },
        {image: "/image400.png", name: "Martin Smith2" },

    ]
    const friends = allfriends.slice(0, 8)
    const friendsrequest = friendrequest.slice(0, 8)
    return (

        <div className=''>
            <div>
                <h2 className="my-8 mx-16 font-bold text-3xl">Search New Friend:</h2>
                <AddFriend />
            </div>

            <div className="relative my-8 mx-16 pr-80">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">

                </div>
                <h2 className="my-8 font-bold text-3xl">Search My Friends:</h2>
                <input type="text" id="input-group-1"
                       className="block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                       placeholder="Search Friend"/>
                <button type="button"
                        className="mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Find friend
                </button>

            </div>

{/*friends picture*/}
            <h2 className="mx-16 font-bold text-3xl">My Friends:</h2>
            <section className="mt-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-20">
                    {friends.map(friend => <FriendCard friend={friend}/>)}
                </div>
            </section>

            <h2 className="mx-16 mt-16 mb-8 font-bold text-3xl text-center">Requests:</h2>


            <section className="my-16 mx-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-20">
                    {friendsrequest.map(friendreq => <FriendRequestCard friend={friendreq}/>)}
                </div>
            </section>

        </div>



    );
}