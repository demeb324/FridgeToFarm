// import { AddFriend } from "~/components/AddFriend";
// import React from 'react';
// import {Link} from "react-router";
//
//
//
//     export default function Friends () {
//     return (
//     <div>
//         <div className="flex gap-4 p-4" >
//         <Link to="/friends/add">Add Friend</Link>
//         <Link to="/friends/my-friends">My Friends</Link>
//         </div>
//
//             <p className="font-semibold">Add Friends by Email:</p>
//             <AddFriend />
//     </div>
//
//     );
// }


import {AddFriend} from "~/components/AddFriend";
import React from 'react';
import {Link} from "react-router";

// from martin

export default function allFriends() {
    // martin code
    return (
        <div className='min-h-screen'>
            <div className="flex flex-wrap gap-4 p-4 mx-4 md:mx-16 my-8">
                <Link className="underline text-xl px-4" to="/friends/add">Add Friend</Link>
                <Link className="underline text-xl px-4" to="/friends/my-friends">My Friends</Link>
            </div>
            <h2 className="mx-4 md:mx-16 font-bold text-3xl">Add Friends By Email:</h2>
            <section className="mt-16">
            </section>

            <div className="relative my-8 mx-4 md:mx-16 max-w-md">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">

                </div>
                <input type="text" id="input-group-1"
                       className="block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                       placeholder="Enter Friend's Email"/>
                <button type="button"
                        className="mt-6 text-white bg-amber-500 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Send Request
                </button>

            </div>


        </div>

    );
}