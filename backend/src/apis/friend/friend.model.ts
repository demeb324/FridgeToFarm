import { z } from 'zod/v4'
import {sql} from '../../utils/database.utils.ts';
import {type PrivateUser, PrivateUserSchema} from "../user/user.model.ts";

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