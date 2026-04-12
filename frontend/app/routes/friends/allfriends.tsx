import React, { useState } from 'react';
import { redirect, useLoaderData, useActionData } from "react-router";
import type { Route } from "./+types/allfriends";
import { AddFriend } from "~/components/AddFriend";
import { FriendCard } from "~/components/friendcard";
import { FriendRequestCard } from "~/components/friendrequest";
import { getSession } from "~/utils/session.server";
import type { User } from "~/utils/models/user.model";

type PublicUser = {
    id: string
    username: string
    avatarUrl: string | null
    bio: string | null
    createdAt: string | null
}

export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    const user: User | null = session.has("user") ? session.get("user") : null

    if (!user) {
        throw redirect("/sign-in")
    }

    const cookie = request.headers.get("Cookie") ?? ""
    const authorization = session.get("authorization") ?? ""
    const response = await fetch(`${process.env.REST_API_URL}/friend`, {
        headers: { Cookie: cookie, Authorization: authorization },
    })

    const result = await response.json()

    const friends: PublicUser[] = result?.data?.friends ?? []
    const pendingRequests: PublicUser[] = result?.data?.pendingRequests ?? []

    return { user, friends, pendingRequests }
}

export async function action({ request }: Route.ActionArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    const user: User | null = session.has("user") ? session.get("user") : null

    if (!user) {
        throw redirect("/sign-in")
    }

    const formData = await request.formData()
    const intent = formData.get("intent")

    if (intent === "sendFriendRequest") {
        const email = formData.get("email") as string
        const requestorId = formData.get("requestorId") as string

        const authorization = session.get("authorization") ?? ""
        const response = await fetch(`${process.env.REST_API_URL}/friend/email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: request.headers.get("Cookie") ?? "",
                Authorization: authorization,
            },
            body: JSON.stringify({ email, requestorId }),
        })

        const result = await response.json()
        return { message: result.message, status: result.status }
    }

    const authorization = session.get("authorization") ?? ""
    const headers = {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
        Authorization: authorization,
    }
    const requestorId = formData.get("requestorId") as string

    if (intent === "acceptFriend") {
        const response = await fetch(`${process.env.REST_API_URL}/friend`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ requestorId }),
        })
        const result = await response.json()
        return { message: result.message, status: result.status }
    }

    if (intent === "declineFriend") {
        const response = await fetch(`${process.env.REST_API_URL}/friend`, {
            method: "DELETE",
            headers,
            body: JSON.stringify({ requestorId }),
        })
        const result = await response.json()
        return { message: result.message, status: result.status }
    }

    return null
}

export default function AllFriends() {
    const { user, friends, pendingRequests } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [nameSearch, setNameSearch] = useState("")

    const filteredFriends = friends.filter(friend =>
        friend.username.toLowerCase().includes(nameSearch.toLowerCase())
    )

    return (
        <div>
            <div>
                <h2 className="my-8 mx-4 md:mx-16 font-bold text-3xl">Search New Friend:</h2>
                <AddFriend requestorId={user.id} />
                {actionData?.message && (
                    <p className={`mx-4 md:mx-16 mt-2 text-sm font-medium ${actionData.status === 200 ? "text-green-600" : "text-red-600"}`}>
                        {actionData.message}
                    </p>
                )}
            </div>

            <div className="relative my-8 mx-4 md:mx-16">
                <h2 className="my-8 font-bold text-3xl">Search My Friends:</h2>
                <input
                    type="text"
                    value={nameSearch}
                    onChange={e => setNameSearch(e.target.value)}
                    className="block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                    placeholder="Search by name"
                />
            </div>

            <h2 className="mx-4 md:mx-16 font-bold text-3xl">My Friends:</h2>
            <section className="mt-16">
                {filteredFriends.length === 0 ? (
                    <p className="mx-4 md:mx-16 text-body">
                        {nameSearch ? "No friends match your search." : "You have no friends yet. Search by email above to add some!"}
                    </p>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-4">
                        {filteredFriends.map(friend => (
                            <FriendCard key={friend.id} id={friend.id} friend={{ image: `/api/avatar/${friend.id}`, name: friend.username }} />
                        ))}
                    </div>
                )}
            </section>

            {pendingRequests.length > 0 && (
                <>
                    <h2 className="mx-4 md:mx-16 mt-16 mb-8 font-bold text-3xl text-center">Requests:</h2>
                    <section className="my-16 mx-4 md:mx-16">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-4">
                            {pendingRequests.map(req => (
                                <FriendRequestCard key={req.id} requestorId={req.id} friend={{ image: `/api/avatar/${req.id}`, name: req.username }} />
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
