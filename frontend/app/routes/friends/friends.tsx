import { AddFriend } from "~/components/AddFriend";
import React from 'react';
import {Link} from "react-router";



    export default function Friends () {
    return (
    <div>
        <div className="flex gap-4 p-4" >
        <Link to="/friends/add">Add Friend</Link>
        <Link to="/friends/my-friends">My Friends</Link>
        </div>

            <p className="font-semibold">Add Friends by Email:</p>
            <AddFriend />
    </div>

    );
}