import type {Request,Response} from "express";
import {type PrivateUser, PrivateUserSchema, selectPrivateUserByUserEmail} from "../user/user.model.ts";
import {jwt, z, ZodUUID} from "zod/v4";
import {zodErrorResponse} from "../../utils/response.utils.ts";
import type {Status} from "../../utils/interfaces/Status.ts";
import {generateJwt, validatePassword} from "../../utils/auth.utils.ts";

import {v4 as uuid} from "uuid";
export async function signInController (request: Request, response: Response): Promise<void> {
    try {
        //validate the new profile data coming from the request body
        const validationResult = PrivateUserSchema
            .pick({email:true})
            .extend({
                password: z.string('password is required')
                    .min(8, 'user password cannot be less than 8 characters')
                    .max(32, 'user password cannot be over')
                        }).safeParse(request.body)
        //if the validation is unsuccessful, return a preformatted response to the client
        if (!validationResult.success) {
            zodErrorResponse(response, validationResult.error)
            return
        }
        //deconstruct the email and password from the request body
        const {email, password} = validationResult.data

        //select the user by the email from the database
        const user: PrivateUser | null = await selectPrivateUserByUserEmail(email)

        //create a preformatted response to send to the client if sign in fails
        const signInFailedStatus: Status = {status:400,message:'Email or password is incorrect please try again.',data:null}

        if (user === null) {
            response.json(signInFailedStatus)
            return
        }

        //check if the password matches hash
        const isPasswordValid = await validatePassword(user.hash, password,)
        // check for failed sign in, if sign in failed, return a response to client

        if (!isPasswordValid) {
            response.json(signInFailedStatus)
            return
        }

        //if sign in was successful, create a new session for the client and return a response to the client
        //deconstruct the id, bio, avatar_url, and username from the User
        const {id,createdAt,bio,avatarUrl,username} = user

        //generate a new signature for the session
        const signature: string = uuid()

        //generate a new jwt for the session using the id, bio, email, avatar_url, username and signature
        const authorization: string = generateJwt({
            id,
            createdAt,
            bio,
            avatarUrl,
            username,
        },signature)

        //set the session variables
        request.session.user = user
        request.session.jwt = authorization
        request.session.signature = signature

        //set the authorization header
        response.header({
            authorization
        })

        //return a response to the client
        response.json({status:200,message: 'Sign in successful', data:null})
        return

        //catch any errors that occurred during the sign-in process and return a response to the client
        } catch (error:any) {
        response.json({ status: 500, data:null, message: error.message })
    }
}