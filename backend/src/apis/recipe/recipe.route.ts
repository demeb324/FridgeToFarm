import { Router } from 'express'
import {
    getRecipeByCuisineController,
    getRecipeByIdController, getRecipesByIngredientController, getRecipesByUserIdController,
    postRecipeController,

} from './recipe.controller.ts'
import {isLoggedInController } from '../../utils/controllers/is-logged-in.controller.ts'
const basePath = '/apis/recipe' as const

const router = Router ()

router.route('/')
    .post(isLoggedInController, postRecipeController)

router.route('/:id')
    .get(getRecipeByIdController)

router.route('/userId/:userId')
    .get(getRecipesByUserIdController)

router.route('/cuisine-and-meal-category/:cuisine/:mealCategory')
    .get(getRecipeByCuisineController)

router.route('/ingredient/:ingredient')
    .get(getRecipesByIngredientController)

export const recipeRoute = { basePath, router }


