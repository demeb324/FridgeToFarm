import {z} from "zod/v4";
import type {Status} from "~/utils/interfaces/Status";
import {v7 as uuid} from 'uuid'


export const UserSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id'),

    avatarUrl:z.url('please provide a valid user image url' )
        .max(255, {message: 'please provide a valid avatar Url (max 255 characters'})
        .trim()
        .nullable(),
    bio: z.string('please provide a valid user bio')
        .max(512, 'please provide a valid bio (max 512 characters)' )
        .trim()
        .nullable(),
    createdAt: z.coerce.date('please provide a valid date')
        .nullable(),
    username: z.string('Please provide a valid username')
        .trim()
        .min(1, 'please provide a valid username (min 1 characters)')
        .max(32, 'please provide a valid username (max 32 characters)')


})

export type User = z.infer<typeof UserSchema>


export const SignUpUserBaseSchema = UserSchema

    .omit({ avatarUrl: true, bio: true, createdAt: true, id: true })

    .extend ({
        email: z
            .email('please provide a valid email')
            .max(128, 'please provide a valid email (max 128 characters)'),
        passwordConfirm: z.string('password confirmation is required')
            .min(8, 'password confirm cannot be less than 8 characters' )
            .max(32, 'profile password ' ),
        password: z.string('password is required')
            .min(8, 'profile password cannot be less than 8 characters')
            .max(32, 'profile password cannot be over 32 characters')
    })

export const SignUpUserSchema = SignUpUserBaseSchema.refine(data => data.password === data.passwordConfirm, {
    message: 'passwords do not match',
    path: ['passwordConfirm']
})



export type SignUpUser = z.infer<typeof SignUpUserSchema>



export async function fetchUserById(userId: string): Promise<{ username: string } | null> {
    const response = await fetch(`${process.env.REST_API_URL}/user/${encodeURIComponent(userId)}`)
    const result = await response.json()
    if (result.status !== 200 || !result.data) return null
    return result.data
}

 export async function postSignUp(data: SignUpUser ) : Promise<Status> {
    const modifiedSignUpUser = {id: uuid(), ...data }
     const response = await fetch(`${process.env.REST_API_URL}/sign-up`, {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json'
         },
         credentials: 'include',
         body: JSON.stringify(modifiedSignUpUser)
     })

     if( !response.ok) {
         throw new Error('Failed to sign up user')
     }

     const result = await response.json()

     return result

 }