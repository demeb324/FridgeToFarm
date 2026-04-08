import {type Request, response, type Response} from 'express'

import {
    type Ingredient,
    insertIngredient,
    ingredientSchema, selectAllIngredients
} from "./ingredient.model.ts";

import {serverErrorResponse, zodErrorResponse} from "../../utils/response.utils.ts";
import type {Status} from "../../utils/interfaces/Status.ts";
import {request} from "node:http";
import {z} from "zod/v4";

export async function postIngredientController(request: Request, response: Response): Promise<void> {
    try {
        const validationResult = ingredientSchema.safeParse(request.body)
        if (!validationResult.success) {
            zodErrorResponse(response, validationResult.error)
            return
        }
        const user = request.session?.user
        if (!user) {
            response.json({status: 401, message: 'Please login to insert an ingredient', data: null})
            return
        }

        const message = await insertIngredient(validationResult.data)
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

export async function getAllIngredientsController(request: Request, response: Response): Promise<void> {
    try {
        const ingredients: Ingredient[] = await selectAllIngredients()

        response.json({status: 200, message: null, data: ingredients})
    } catch (error: any) {
        console.error(error)
        serverErrorResponse(response, error.message)
    }
}