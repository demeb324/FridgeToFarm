// import type {Request, Respose} from "express";
// import {
//     type PrivateUSer,
//     PublicUserSchema,
//     selectPrivateUserByUserId,
//     selectPublicactivationToken,
//     selectPublicavatarUrl,
//     selectPublicbio,
//     selectPubliccreatedAt,
//     selectPublicemail,
//     selectPublichash,
//     selectPublicusername,
//     updatedUser
// } from "./user.model.ts";
// import {serverErrorResponse, ZodErrorResponse} from "../../utils/ response.utils.ts";
// import {generateJwt} from "../../utils/auth.utils.ts";
// import pkg from 'jsonwebtoken'
// import {zodErrorResponse} from "../../utils/response.utils.ts";
//
// const {verify} = pkg
//
// export async function getPublicUserProfileByUserIdController(request: Request, response: Response) : Promise<void> {
//
// try {
//     const validationResult = PublicUserSchema.pick({id: true}).safeParse(request.params)
//     if (!validationResult.success) {
//         zodErrorResponse(response, validationResult.error)
//         return
//     }
//     const {id} = validationResult.data
//
//     const data = await selectPublicUserByUserId(id)
//
//     response.json({status: 200, message: null, data})
// } catch (error: unknown) {
//     console.error(error)
//
//     serverErrorResponse(response, null)
//     }
// }
//
// export async function getPublicUserByUserNameController(request: Request, response: Response): Promise<void> {
//     try {
//         const validationResult = PublicUserSchema.pick({username: true}).safeParse(request.params)
//
//         if (!validationResult.success) {
//             zodErrorResponse(response, validationResult.error)
//             return
//         }
//         const {username} = validationResult.data
//
//         const data = await selectPublicUserByUserName(username)
//
//         response.json({status: 200, message: null, data})
//     } catch (error: unknown) {
//
//         console.error(error)
//
//         serverErrorResponse(response,null)
//     }
// }
//
// export async function getPublicProfilesByUserNamecontroller(request: Request, response: Response) : Promise<void> {
//     try {
//         const validationResult = PublicUserSchema.pick({username: true}).safeParse(request.params)
//
//         if (!validationResult.success) {
//             ZodErrorResponse(response, validationResult.error)
//             return
//         }
//         const {username} = await selectPublicUsersbyUserName(username)
//
//         response.json({status: 200, message: null, data})
//
//     }catch (error: unknown) {
//         console.error(error)
//
//         serverErrorResponse(response, [])
//         }
//     }
//
//     export async function putUserController(request: Request, response: Response): Promise<void> {
//     try {
//         const validationResultForRequestBody = PublicUserSchema.safeParse(request.body)
//
//         if(! validationResultForRequestBody.success) {
//             zodErrorResponse(response, validationResultForRequestBody.error)
//                 return
//         }
//
//     const validationResultForRequestParams = PublicUserSchema.pick ({id: true}).safeParse(request.params)
//
//         if(!validationResultForRequestParams.success) {
//         zodErrorResponse(response, validationResultForRequestParams.error)
//             return
//     }
//     const userFromSession = request.session?.user
//         const idFromSession = userFromSession?.id
//
//         // we will need this in the future line 163 githug come back to read this
//     }