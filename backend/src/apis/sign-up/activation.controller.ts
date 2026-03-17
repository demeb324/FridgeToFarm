import type {Request, Response} from 'express'
import {
    selectUserByActivationToken,
    updateUser
} from '../user/user.model'
import type {Status} from '../../utils/interfaces/Status'

import {zodErrorResponse} from '../../utils/response.utils'
import {z} from "zod/v4";



export async function activationController(request: Request, response: Response, ): Promise<void> {
    try {
        const validationResult = z
            .object({
                activation: z
                    .string('activation is required')
                    .length(32, 'please provide a valid activation token')
            }).safeParse(request.params)

        if (!validationResult.success) {
            zodErrorResponse(response, validationResult.error)
            return
        }

        const {activation} = validationResult.data

        const user = await selectUserByActivationToken(activation)

        if (user === null) {
            response.json({
                status: 400,
                data: null,
                message: 'Account activation has failed. Have you already activated this account?'
            })
            return
        }
        user.activationToken = null
        await updateUser(user)
        response.json({
            status: 200,
            data: null,
            message: 'Account activation was successful'
        })
    } catch (error) {
    console.error(error)
        response.json({status: 500, data: null, message: 'internal server error try again later'})
        }
    }