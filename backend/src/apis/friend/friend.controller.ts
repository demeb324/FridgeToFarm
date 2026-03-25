import type {Request, Response} from "express";
import {serverErrorResponse, zodErrorResponse} from "../../utils/response.utils.ts";
import type {Status} from "../../utils/interfaces/Status.ts";
import {friendSchema, insertFriend} from "./friend.model.ts";




export async function postFriendController(request: Request, response: Response): Promise<void> {
    try {
        // validate the full recipe object from the request body
        const validationResult = friendSchema.safeParse(request.body)
        if (!validationResult.success) {
            zodErrorResponse(response, validationResult.error)
            return
        }
        const user = request.session?.user
        if (!user) {
            response.json({status: 401, message: 'Please login to create add friend', data: null})
            return
        }
        if (validationResult.data.requestorId !== user.id) {
            response.json({status: 403, message: 'User Id in request does not match authenticated friend', data: null})
            return
        }
        const message = await insertFriend(validationResult.data)

        const status: Status = {
            status: 200,
            message,
            data: null
        }
        response.json(status)
    } catch (error: any) {
        console.error(error)
        serverErrorResponse(response, error.message)
    }
}