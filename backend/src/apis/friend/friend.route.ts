import {Router} from 'express'
import {
    getFriendsController,
    getMutualFriendsController,
    postFriendController,
    postFriendByEmailController,
    putFriendController,
    deleteFriendController,
} from './friend.controller.ts'

import { isLoggedInController} from "../../utils/controllers/is-logged-in.controller.ts"

const basepath = '/apis/friend' as const
const router = Router()

/**
 * GET /apis/friend
 * Get accepted friends and pending requests for the logged-in user
 *
 * POST /apis/friend
 * Request new friend by user IDs (requires authentication)
 */
router.route('/')
    .get(isLoggedInController, getFriendsController)
    .post(isLoggedInController, postFriendController)
    .put(isLoggedInController, putFriendController)
    .delete(isLoggedInController, deleteFriendController)

/**
 * GET /apis/friend/mutual/:profileUserId
 * Get mutual friends between the logged-in user and the given profile
 */
router.route('/mutual/:profileUserId')
    .get(isLoggedInController, getMutualFriendsController)

/**
 * POST /apis/friend/email
 * Send a friend request by searching for user by email
 */
router.route('/email')
    .post(isLoggedInController, postFriendByEmailController)

export const friendRoute = {basepath, router}