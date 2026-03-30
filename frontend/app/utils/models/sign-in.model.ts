import {z} from 'zod/v4'
import {SignUpUserBaseSchema} from "~/utils/models/user.model";
import * as process from "node:process";
import type {Status} from "~/utils/interfaces/Status";

export const SignInSchema = SignUpUserBaseSchema.pick({email: true, password:true})

export type SignIn = z.infer<typeof SignInSchema>

export async function postSignIn(data: SignIn):Promise<{result:Status, headers: Headers}> {
    console.log(`rest api url${process.env.REST_API_URL}`)
    const response = await fetch(`${process.env.REST_API_URL}/sign-in`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
    });

    if(!response.ok) {
        throw new Error('Failed to sign in')
    }
    const headers = response.headers
    const result = await response.json()
    return {result, headers}
}