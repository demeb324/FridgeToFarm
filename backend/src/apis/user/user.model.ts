import { z } from 'zod/v4'
import {sql} from '../../utils/database.utils.ts';
import {userInfo} from "os";

export const PrivateUserSchema = z.object({
  id: z.uuidv7('Please provide a valid uuid for id'),
    activationToken: z.string('Please provide a valid activationToken')
        .length(32, 'user activation token must be 32 characters')
        .nullable(),
    avatarUrl:z.url('please provide a valid user image url' )
        .max(255, {message: 'please provide a valid avatar Url (max 255 characters'})
        .trim()
        .nullable(),
    bio: z.string('please provide a valid user bio')
        .max(512, 'please provide a valid bio (max 512 characters)' )
        .trim()
        .nullable(),
   createdAt: z.date('please provide a valid date')
       .nullable(),
    email: z
        .email('please provide a valid email')
        .max(128, 'please provide a valid email (max 128 characters)'),
    hash: z.string('Please provide a valid hash')
        .length(97, {message: 'user hash must be 97 characters'}),

    username: z.string('Please provide a valid username')
        .trim()
        .min(1, 'please provide a valid username (min 1 characters)')
        .max(32, 'please provide a valid username (max 32 characters)')


})


export const PublicUserSchema = PrivateUserSchema.omit({hash: true, activationToken: true, email: true})

export type PrivateUser = z.infer<typeof PrivateUserSchema>

export type PublicUser = z.infer<typeof PublicUserSchema>

export async function insertUser(user: PrivateUser): Promise<string> {
  PrivateUserSchema.parse(user)
  const {id, activationToken, avatarUrl,  bio, email, hash, username} = user
  await sql`INSERT INTO "user"(id, activation_token, avatar_url, bio, created_at, email, hash, username) VALUES (${id}, ${activationToken}, ${avatarUrl}, ${bio}, now(), ${email}, ${hash}, ${username})`
  return 'User Successfully Created'
}

export async function selectUserByActivationToken (activationToken: string): Promise<PrivateUser|null> {

  const rowList = await sql`SELECT id, activation_token, avatar_url, bio, created_at, email, hash, username FROM "user" WHERE activation_token = ${activationToken}`
  const result = PrivateUserSchema.array().max(1).parse(rowList)
  return result[0] ?? null
}

// export async function selectPublicUserByUserId (id: string): Promise<PublicUser | null> {
//
//   // create a prepared statement that selects the profile by id and execute the statement
//   const rowList = await sql`SELECT id, avatar_url, bio, userame FROM user WHERE id = ${id}`
//
//   // enforce that the result is an array of one profile, or null
//   const result = PublicUserSchema.array().max(1).parse(rowList)
//
//   // return the profile or null if no profile was found
//   return  result[0] ?? null
// }

// export async function selectPublicUserByUserName(name: string): Promise<PublicUser | null> {
//
//   // create a prepared statement that selects the profile by name and execute the statement
//   const rowList = await sql`SELECT id, about, image_url, name FROM "user" WHERE name = ${name}`
//
//   // enforce that the result is an array of one profile, or null
//   const result = PublicUserSchema.array().max(1).parse(rowList)
//
//   // return the profile or null if no profile was found
//   return result[0] ?? null
// }
//
export async function updateUserPasswordById (id: string, newHash: string): Promise<void> {
  await sql`UPDATE "user" SET hash = ${newHash} WHERE id = ${id}`
}

export async function updateUserBioById (id: string, bio: string | null): Promise<void> {
  await sql`UPDATE "user" SET bio = ${bio} WHERE id = ${id}`
}

export async function updateUser (user: PrivateUser): Promise<string> {
  const { id, activationToken, avatarUrl, bio, createdAt, email, hash, username } = user
  await sql `UPDATE "user" SET activation_token = ${activationToken}, avatar_url = ${avatarUrl}, bio = ${bio}, created_at = ${createdAt}, email = ${email}, hash = ${hash}, username = ${username} WHERE id = ${id}`
  return 'Profile successfully updated'
}
//
export async function selectPrivateUserByUserEmail (email: string): Promise<PrivateUser | null> {
  // create a prepared statement that selects the user by email and execute the statement
  const rowList = await sql`SELECT id, activation_token, avatar_url, bio, created_at, email, hash, username FROM "user" WHERE email = ${email}`
//
  // enforce tha the result is an array of one user, or null
  const result = PrivateUserSchema.array().max(1).parse(rowList)

  // return the user or null if no profile was found
  return result[0] ?? null
}
//
// export async function selectPublicUserbyUserId (id: string): Promise<PublicUser | null> {
//   // create a prepared statement that selects the user by id and execute the statement
//   const rowList = await sql`SELECT id, about, image_url, name FROM "user" WHERE id = ${id}`
//
//   // enforce that the result is an array of one profile, or null
//   const result = PublicUserSchema.array().max(1).parse(rowList)
//
//   // return the user or null if no user was found
//   return result[0] ?? null
// }
//
// export async function selectPublicUserByUserName (name: string): Promise<PublicUser | null> {
//   // create a prepared statement that selects the profile by name and executes the statement
//   const rowList = await sql`SELECT id, about, image_url, name FROM "user" WHERE name = ${name}`
//
//   // enforce that the result is an array of one user, or null
//   const result = PublicUserSchema.array().max(1).parse(rowList)
//
//   // return the user or null if no profile was found
//   return result[0] ?? null
// }
//
// export async function selectPublicUserByUserName (name: string): Promise<PublicUser[]> {
//   // format name to include wildcars
//   const nameWithWildcards = `%${name}%`
//
//   // create a prepared statement that selects users by name and execute the statement
//   const rowList = await sql`SELECT id, about, image_url, name FROM "user" WHERE name LIKE ${nameWithWildcards}`
//
//   return PublicUserSchema.array().parse(rowList)
// }



