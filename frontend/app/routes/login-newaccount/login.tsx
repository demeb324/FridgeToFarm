import type { Route } from "./+types/login"
import {commitSession, getSession} from "~/utils/session.server";
import {Form, redirect, useActionData} from "react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {postSignIn, type SignIn, SignInSchema} from "~/utils/models/sign-in.model";
import type {FormActionResponse} from "~/utils/interfaces/FormActionResponse";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";
import {jwtDecode} from "jwt-decode";
import {UserSchema} from "~/utils/models/user.model";
import {FieldError} from "~/components/FieldError";
import {useState} from "react";
import {StatusMessage} from "~/components/StatusMessage";
import {Eye, EyeOff} from "lucide-react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "New React Router App" },
        { name: "description", content: "Welcome to React Router!" },
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    // Get existing session from cookie
    const session = await getSession(
        request.headers.get('Cookie')
    )

    // Check if user is already authenticated
    if (session.has('user')) {
        return redirect('/')
    }
}

const resolver = zodResolver(SignInSchema)

export async function action({request}: Route.ActionArgs): Promise<FormActionResponse | Response> {
    // Get existing session from cookie
    const session = await getSession(
        request.headers.get('Cookie')
    )

    const {errors, data, receivedValues: defaultValues} = await getValidatedFormData<SignIn>(request, resolver)

    if(errors) {
        return{errors, defaultValues}
    }

    const {result, headers} = await postSignIn(data)
    console.log(result)
    // extract the authorization token from the headers
    const authorization = headers.get('authorization')

    // extract the express session cookie from response headers
    const expressSessionCookie = headers.get('Set-Cookie')

    // Check if authentication was successful
    if(result.status !== 200 || !authorization) {
        return { success: false, status: result }
    }

    // Decode JWT token to extract user profile
    const parsedJwtToken = jwtDecode(authorization) as any
    console.log(parsedJwtToken)
    //Validate user data from JWT
    const validationResult = UserSchema.safeParse(parsedJwtToken.auth)

    // Handle invalid user data
    if ( !validationResult.success ) {
        console.log(validationResult.error)
        session.flash('error', 'user is malformed')
        return {
            success: false,
            status: {status: 400, data: null, message: 'sign in attempt failed try again'}
        }
    }

        session.set('authorization', authorization)
        session.set('user', validationResult.data)
        session.set('ingredients', {})

        const responseHeaders = new Headers()
        responseHeaders.append('Set-Cookie', await commitSession(session))
        if (expressSessionCookie) {
            responseHeaders.append('Set-Cookie', expressSessionCookie)
        }

    return redirect('/', {headers: responseHeaders})

}

export default function Login() {

    const [showPassword, setShowPassword] = useState(false);

    const {handleSubmit, formState: {errors}, register} = useRemixForm<SignIn>({mode:'onSubmit', resolver})

    const actionData = useActionData<typeof action>();

    return(
        <>
            <h1 className="my-8 text-center font-bold text-4xl">Log in</h1>

            <div className="mx-4">
            <Form onSubmit={handleSubmit} className="container mx-auto space-y-6" method="POST">
            <div>
                <div className="relative my-8">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg className="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                             width="24"
                             height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                                  d="m3.5 5.5 7.893 6.036a1 1 0 0 0 1.214 0L20.5 5.5M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
                        </svg>
                    </div>
                    <input
                        type="text" id="input-group-1"
                        {...register('email')}
                           className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body
                            ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                           placeholder="name@flowbite.com"/>
                    <FieldError error={errors} field={'email'} />
                </div>

                <div className="relative my-8">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg className="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                             width="24"
                             height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                                  d="m3.5 5.5 7.893 6.036a1 1 0 0 0 1.214 0L20.5 5.5M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
                        </svg>

                    </div>

                    <label
                        htmlFor="password"
                        className="sr-only"
                    >
                        Password
                    </label>

                    <input
                        {...register('password')}
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        placeholder="Enter password"
                           className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body`}
                           />

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                        {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                        )}
                    </button>

                </div>



                <button
                    type="submit"
                        className="mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Submit
                </button>
            </div>
                <StatusMessage actionData={actionData} />
            </Form>
            </div>
        </>
    )
}
