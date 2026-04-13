import { redirect, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/friendprofile";
import { getSession } from "~/utils/session.server";

export async function loader({ request, params }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    if (!session.has("user")) {
        throw redirect("/sign-in")
    }

    const response = await fetch(`${process.env.REST_API_URL}/user/${params.userId}`)
    const result = await response.json()

    if (result.status !== 200 || !result.data) {
        throw new Response("Friend not found", { status: 404 })
    }

    return { friend: result.data }
}

export default function FriendProfile() {
    const { friend } = useLoaderData<typeof loader>()

    const joinedDate = friend.createdAt
        ? new Date(friend.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown'

    return (
        <div className="min-h-screen p-8 max-w-lg mx-auto">
            <Link to="/allfriends" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-8">
                ← Back to Friends
            </Link>
            <div className="flex flex-col items-center gap-6 mt-8">
                <img
                    src={`/api/avatar/${friend.id}`}
                    alt={friend.username}
                    className="w-32 h-32 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/image400.png" }}
                />
                <div className="w-full space-y-4">
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Username</p>
                        <p className="text-2xl font-bold">{friend.username}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Joined</p>
                        <p className="text-lg">{joinedDate}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Bio</p>
                        <p className="text-lg">{friend.bio ?? 'No bio yet.'}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
