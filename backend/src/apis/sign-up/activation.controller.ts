// import {z} from "zod/v4";
//
//
// export async function activationController(request: Request, response: Response, ): Promise<void> {
//     try {
//         const validationResult = z
//             .object({
//                 activation: z
//                     .string('activation is required')
//                     .length(32, 'please provide a valid activation token')
//             }).safeParse(request.params)
//
//         if (!validationResult.success) {
//             zodErrorResponse(response, validationResult.error)
//             return
//         }
//
//         const {activation} = validationResult.data
//
//         const user = await selectPrivatedUserByUserActivationToken(activation)
//
//         if (user === null) {
//             response.json({
//                 status: 400,
//                 data: null,
//                 message: 'Account activation has failed. Have you already activated this account?'
//             })
//             return
//         }
//         user.activationToker = null
//         await updateUser(profile)
//         response.json({
//             status: 200,
//             data: null,
//             message: 'Account activation was succesful'
//         })
//     } catch (error) {
//     console.error(error) {
//         response.json({status: 500, data: null, message: 'internal server error try again later'})
//         }
//     }