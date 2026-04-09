import type { Request, Response } from 'express'
import { z } from 'zod/v4'
import { selectPrivateUserByUserEmail, updateUserPasswordById, updateUserBioById } from './user.model.ts'
import { validatePassword, setHash } from '../../utils/auth.utils.ts'
import { zodErrorResponse, serverErrorResponse } from '../../utils/response.utils.ts'

export async function putUpdateProfileController (request: Request, response: Response): Promise<void> {
    try {
        const validationResult = z.object({
            bio: z.string().max(512, 'Bio cannot exceed 512 characters').nullable().optional(),
            currentPassword: z.string().max(32).optional(),
            newPassword: z.string().max(32).optional(),
            confirmPassword: z.string().max(32).optional(),
        }).safeParse(request.body)

        if (!validationResult.success) {
            zodErrorResponse(response, validationResult.error)
            return
        }

        const { bio, currentPassword, newPassword, confirmPassword } = validationResult.data

        const sessionUser = request.session.user
        if (!sessionUser) {
            response.json({ status: 401, message: 'Not signed in', data: null })
            return
        }

        // Update bio (always, even if empty string — treat empty as clearing it)
        const newBio = bio?.trim() || null
        await updateUserBioById(sessionUser.id, newBio)

        // Only update password if newPassword was provided
        if (newPassword) {
            if (!currentPassword || !confirmPassword) {
                response.json({ status: 400, message: 'Current password and confirmation are required to change password', data: null })
                return
            }
            if (newPassword.length < 8) {
                response.json({ status: 400, message: 'New password must be at least 8 characters', data: null })
                return
            }
            if (newPassword !== confirmPassword) {
                response.json({ status: 400, message: 'New password and confirmation do not match', data: null })
                return
            }

            const user = await selectPrivateUserByUserEmail(sessionUser.email)
            if (!user) {
                response.json({ status: 400, message: 'Incorrect current password', data: null })
                return
            }

            const isValid = await validatePassword(user.hash, currentPassword)
            if (!isValid) {
                response.json({ status: 400, message: 'Incorrect current password', data: null })
                return
            }

            const newHash = await setHash(newPassword)
            await updateUserPasswordById(user.id, newHash)
        }

        response.json({ status: 200, message: 'Profile updated successfully', data: null })
    } catch (error: unknown) {
        console.error(error)
        serverErrorResponse(response)
    }
}
