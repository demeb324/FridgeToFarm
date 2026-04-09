import { Router } from 'express'
import { putUpdateProfileController } from './user.controller.ts'

const basePath = '/apis/user' as const

const router = Router()

router.route('/update-profile').put(putUpdateProfileController)

export const userRoute = { basePath, router }
