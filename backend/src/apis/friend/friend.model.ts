import { z } from 'zod/v4'
import {sql} from '../../utils/database.utils.ts';
import {type PrivateUser, PrivateUserSchema, type PublicUser, PublicUserSchema} from "../user/user.model.ts";

export const friendSchema = z.object({
    requesteeId: z.uuidv7('Please provide a valid uuid for requestee id'),
    requestorId: z.uuidv7('Please provide a valid requestor id'),
    accepted: z.boolean('please accept or reject the friend request' )
        .nullable(),
})

export type Friend = z.infer<typeof friendSchema>

export async function insertFriend(friend: Friend): Promise<string> {
    friendSchema.parse(friend)

    await sql`
       INSERT INTO friend (requestee_id, requestor_id, accepted)
       VALUES (${friend.requesteeId}, ${friend.requestorId}, false)`

    return 'Friend request successfully sent'
}

export async function selectFriendByPrimaryKey (requesteeId: string, requestorId: string): Promise<Friend | null> {

    const rowList = await sql`
    SELECT requestee_id, requestor_id, accepted
    FROM friend
    WHERE requestor_id = ${requestorId} AND requestee_id = ${requesteeId}`

    const result = friendSchema.array().max(1).parse(rowList)
    return result[0] ?? null
}

export async function updateFriendAccepted (requesteeId: string, requestorId: string): Promise<string> {
    await sql`
        UPDATE friend SET accepted = true
        WHERE requestee_id = ${requesteeId} AND requestor_id = ${requestorId}`
    return 'Friend request accepted'
}

export async function deleteFriend (requesteeId: string, requestorId: string): Promise<string> {
    await sql`
        DELETE FROM friend
        WHERE requestee_id = ${requesteeId} AND requestor_id = ${requestorId}`
    return 'Friend request declined'
}

export async function selectAcceptedFriendsByUserId (userId: string): Promise<PublicUser[]> {
    const rowList = await sql`
        SELECT u.id, u.avatar_url, u.bio, u.created_at, u.username
        FROM "user" u
        JOIN friend f ON (
            (f.requestor_id = ${userId} AND f.requestee_id = u.id)
            OR (f.requestee_id = ${userId} AND f.requestor_id = u.id)
        )
        WHERE f.accepted = true
        ORDER BY u.username ASC`

    return PublicUserSchema.array().parse(rowList)
}

export async function selectMutualFriendsByUserIds(userId1: string, userId2: string): Promise<PublicUser[]> {
    const rowList = await sql`
        SELECT u.id, u.avatar_url, u.bio, u.created_at, u.username
        FROM "user" u
        JOIN friend f1 ON (
            (f1.requestor_id = ${userId1} AND f1.requestee_id = u.id)
            OR (f1.requestee_id = ${userId1} AND f1.requestor_id = u.id)
        )
        JOIN friend f2 ON (
            (f2.requestor_id = ${userId2} AND f2.requestee_id = u.id)
            OR (f2.requestee_id = ${userId2} AND f2.requestor_id = u.id)
        )
        WHERE f1.accepted = true AND f2.accepted = true
        ORDER BY u.username ASC`
    return PublicUserSchema.array().parse(rowList)
}

export async function selectPendingRequestsByUserId (userId: string): Promise<PublicUser[]> {
    const rowList = await sql`
        SELECT u.id, u.avatar_url, u.bio, u.created_at, u.username
        FROM "user" u
        JOIN friend f ON f.requestor_id = u.id
        WHERE f.requestee_id = ${userId}
        AND (f.accepted = false OR f.accepted IS NULL)
        ORDER BY u.username ASC`

    return PublicUserSchema.array().parse(rowList)
}

// export async function findFriendByEmail (email: string): Promise<PrivateUser | null> {
//     // create a prepared statement that selects the user by email and execute the statement
//     const rowList = await sql`SELECT requesteeId, requestorId FROM "user" WHERE email = ${email}`
// //
//     // enforce tha the result is an array of one user, or null
//     const result = PrivateUserSchema.array().max(1).parse(rowList)
//
//     // return the user or null if no profile was found
//     return result[0] ?? null
// }