import {Router} from 'express'
import {
    postFriendController,
    // deleteReviewController,

} from './friend.controller.ts'

import { isLoggedInController} from "../../utils/controllers/is-logged-in.controller.ts"

const basepath = '/apis/friend' as const
const router = Router()

/**
 * POST /apis/friend
 * Request new friend (requires authentication)
 */

router.route('/')
    .post(isLoggedInController, postFriendController)

export const friendRoute = {basepath, router}