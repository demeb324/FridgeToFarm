import {z} from "zod/v4";
import {PrivateUserSchema} from "../user/user.model.ts";


export const SignUpUserSchema = PrivateUserSchema

    .omit({ hash: true, activationToken: true, avatarUrl: true, bio: true, createdAt: true })

    .extend ({
        passwordConfirm: z.string('password confirmation is required')
            .min(8, 'password confirm cannot be less than 8 characters' )
            .max(32, 'profile password ' ),
            password: z.string('password is required')
                .min(8, 'profile password cannot be less than 8 characters')
                .max(32, 'profile password cannot be over 32 characters')
})
    .refine(data => data.password === data.passwordConfirm, {
        message: 'passwords do not match'
    })