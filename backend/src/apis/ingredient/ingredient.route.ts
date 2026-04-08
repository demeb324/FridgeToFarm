import { Router } from 'express'
import {
    postIngredientController,
    getAllIngredientsController
} from "./ingredient.controller.ts";

import {isLoggedInController} from "../../utils/controllers/is-logged-in.controller.ts";

const basepath = '/apis/ingredients' as const

const router = Router()

router.route('/')
    .post(isLoggedInController, postIngredientController)
    .get(getAllIngredientsController)

export const ingredientRoute = { basepath, router }