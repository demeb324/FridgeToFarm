import type { Route } from "./+types/login"
import {commitSession, getSession} from "~/utils/session.server";
import {Form, redirect, useActionData, useFetcher} from "react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {postSignIn, type SignIn, SignInSchema} from "~/utils/models/sign-in.model";
import {postSignUp, SignUpUserSchema, type SignUpUser} from "~/utils/models/user.model";
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
    const session = await getSession(request.headers.get('Cookie'))
    if (session.has('user')) {
        return redirect('/')
    }
}

const signInResolver = zodResolver(SignInSchema)
const signUpResolver = zodResolver(SignUpUserSchema)

export async function action({request}: Route.ActionArgs): Promise<FormActionResponse | Response> {
    const session = await getSession(request.headers.get('Cookie'))

    const intent = new URL(request.url).searchParams.get('intent')

    // Handle registration
    if (intent === 'register') {
        const {errors, data, receivedValues: defaultValues} = await getValidatedFormData<SignUpUser>(request, signUpResolver)

        if (errors) {
            return { errors, defaultValues, intent: 'register' }
        }

        const result = await postSignUp(data)

        if (result.status !== 201) {
            return { success: false, status: result, intent: 'register' }
        }

        return { success: true, status: result, intent: 'register' }
    }

    // Handle login (default intent)
    const {errors, data, receivedValues: defaultValues} = await getValidatedFormData<SignIn>(request, signInResolver)

    if(errors) {
        return {errors, defaultValues, intent: 'login'}
    }

    const {result, headers} = await postSignIn(data)
    const authorization = headers.get('authorization')
    const expressSessionCookie = headers.get('Set-Cookie')

    if(result.status !== 200 || !authorization) {
        return { success: false, status: result, intent: 'login' }
    }

    const parsedJwtToken = jwtDecode(authorization) as any
    const validationResult = UserSchema.safeParse(parsedJwtToken.auth)

    if (!validationResult.success) {
        console.log(validationResult.error)
        session.flash('error', 'user is malformed')
        return {
            success: false,
            status: {status: 400, data: null, message: 'sign in attempt failed try again'},
            intent: 'login'
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

    const redirectTo = new URL(request.url).searchParams.get('redirectTo') ?? '/'
    return redirect(redirectTo, {headers: responseHeaders})
}

function EmailIcon() {
    return (
        <svg className="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2"
                  d="m3.5 5.5 7.893 6.036a1 1 0 0 0 1.214 0L20.5 5.5M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
        </svg>
    )
}

function UserIcon() {
    return (
        <svg className="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2"
                  d="M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-6 9a6 6 0 0 1 12 0H6Z"/>
        </svg>
    )
}

function LockIcon() {
    return (
        <svg className="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2"
                  d="M12 14v3m-3-6V7a3 3 0 1 1 6 0v4m-8 0h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z"/>
        </svg>
    )
}

export default function Login() {
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
    const [showPassword, setShowPassword] = useState(false)
    const [showRegisterPassword, setShowRegisterPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Login: main route Form + useActionData — redirect on success works naturally
    const loginForm = useRemixForm<SignIn>({ mode: 'onSubmit', resolver: signInResolver })
    const loginActionData = useActionData<typeof action>() as FormActionResponse | undefined

    // Register: isolated fetcher — its data never bleeds into the login form
    const registerFetcher = useFetcher<typeof action>()
    const registerForm = useRemixForm<SignUpUser>({ mode: 'onSubmit', resolver: signUpResolver, fetcher: registerFetcher })
    const registerActionData = registerFetcher.data as FormActionResponse | undefined

    const tabBase = "flex-1 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
    const tabActive = "bg-white text-amber-600 border-b-2 border-amber-500"
    const tabInactive = "bg-neutral-secondary-medium text-body hover:text-heading"

    return (
        <>
            <h1 className="my-8 text-center font-bold text-4xl">Welcome</h1>

            <div className="mx-4">
                {/* Tabs */}
                <div className="container mx-auto flex border-b border-default-medium mb-6">
                    <button
                        type="button"
                        className={`${tabBase} ${activeTab === 'login' ? tabActive : tabInactive}`}
                        onClick={() => setActiveTab('login')}
                    >
                        Log In
                    </button>
                    <button
                        type="button"
                        className={`${tabBase} ${activeTab === 'register' ? tabActive : tabInactive}`}
                        onClick={() => setActiveTab('register')}
                    >
                        Create Account
                    </button>
                </div>

                {/* Login Form */}
                {activeTab === 'login' && (
                    <Form onSubmit={loginForm.handleSubmit} action="?intent=login" className="container mx-auto space-y-6" method="POST">
                        <div>
                            <div className="relative my-8">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <EmailIcon />
                                </div>
                                <input
                                    type="text"
                                    {...loginForm.register('email')}
                                    className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body
                                        ${loginForm.formState.errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    placeholder="name@example.com"
                                />
                                <FieldError error={loginForm.formState.errors} field={'email'} />
                            </div>

                            <div className="relative my-8">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <LockIcon />
                                </div>
                                <label htmlFor="login-password" className="sr-only">Password</label>
                                <input
                                    {...loginForm.register('password')}
                                    type={showPassword ? "text" : "password"}
                                    id="login-password"
                                    placeholder="Enter password"
                                    className="block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="mt-6 text-white bg-amber-500 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
                            >
                                Log In
                            </button>
                        </div>
                        <StatusMessage actionData={loginActionData} />
                    </Form>
                )}

                {/* Register Form */}
                {activeTab === 'register' && (
                    <Form onSubmit={registerForm.handleSubmit} action="?intent=register" className="container mx-auto space-y-4" method="POST">
                        <div>
                            <div className="relative my-8">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <UserIcon />
                                </div>
                                <input
                                    type="text"
                                    {...registerForm.register('username')}
                                    className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body
                                        ${registerForm.formState.errors.username ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    placeholder="Username"
                                />
                                <FieldError error={registerForm.formState.errors} field={'username'} />
                            </div>

                            <div className="relative my-8">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <EmailIcon />
                                </div>
                                <input
                                    type="text"
                                    {...registerForm.register('email')}
                                    className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body
                                        ${registerForm.formState.errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    placeholder="name@example.com"
                                />
                                <FieldError error={registerForm.formState.errors} field={'email'} />
                            </div>

                            <div className="relative my-8">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <LockIcon />
                                </div>
                                <label htmlFor="register-password" className="sr-only">Password</label>
                                <input
                                    {...registerForm.register('password')}
                                    type={showRegisterPassword ? "text" : "password"}
                                    id="register-password"
                                    placeholder="Password (min 8 characters)"
                                    className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body
                                        ${registerForm.formState.errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showRegisterPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                </button>
                                <FieldError error={registerForm.formState.errors} field={'password'} />
                            </div>

                            <div className="relative my-8">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <LockIcon />
                                </div>
                                <label htmlFor="register-password-confirm" className="sr-only">Confirm Password</label>
                                <input
                                    {...registerForm.register('passwordConfirm')}
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="register-password-confirm"
                                    placeholder="Confirm password"
                                    className={`block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body
                                        ${registerForm.formState.errors.passwordConfirm ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                </button>
                                <FieldError error={registerForm.formState.errors} field={'passwordConfirm'} />
                            </div>

                            <button
                                type="submit"
                                className="mt-6 text-white bg-amber-500 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
                            >
                                Create Account
                            </button>
                        </div>
                        <StatusMessage actionData={registerActionData} />
                    </Form>
                )}
            </div>
        </>
    )
}
