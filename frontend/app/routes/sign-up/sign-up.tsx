import {z} from "zod/v4";
import {zodResolver} from '@hookform/resolvers/zod'
import {Form, Link, useActionData} from "react-router";
import {Mail, Lock, User, Eye, EyeOff} from "lucide-react";
import {useState} from "react";
import type {Route} from "./+types/sign-up";
import {postSignUp, type SignUpUser, SignUpUserSchema} from "~/utils/models/user.model";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";
import {FieldError} from "~/components/FieldError";
import {StatusMessage} from "~/components/StatusMessage";
import type {FormActionResponse} from "~/utils/interfaces/FormActionResponse";


export function meta({}: Route.MetaArgs) {
    return [
        {title: "Sign Up"},
        {name: "description", content: "Create your sign-up account"},
    ];
}

const resolver = zodResolver(SignUpUserSchema)

// 7
export async function action({request}: Route.ActionArgs): Promise<FormActionResponse> {
    const {errors, data, receivedValues: defaultValues} = await getValidatedFormData<SignUpUser>(request, resolver)


    if (errors) {
        return {errors, defaultValues}
    }

    const response = await postSignUp(data)
    console.log(response)

    if (response.status !== 200) {

    }
    return {success: true, status: response}

}

export default function SignUp() {

    // 6
    const {
        handleSubmit,
        formState: {errors},
        register
    } = useRemixForm<SignUpUser>({mode: 'onSubmit', resolver})

    const actionData = useActionData<typeof action>();

    console.log(actionData)

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2"> Welcome. </h1>
                    <p className="text-gray-600 mb-8"> Create an account. </p>

                    <Form onSubmit={handleSubmit} className="space-y-6" noValidate={true} method={'POST'}>
                        {/*// {Email Field}*/}
                        <div>
                            <label htmlFor="email"
                                   className="block text-sm font-medium text-gray-900 mb-2"
                            >
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center ponter-events-none">
                                    <Mail className="h-5 w-5 text-gray-400"/>
                                </div>
                                <input
                                    {...register('email')}
                                    type="email"
                                    id="email"
                                    placeholder="Enter email"
                                    className={`block w-full pl-10 pr-3 py-3 border rounder-lg focus:ring-2 focus:border-transparent bg-gray-50 ${
                                        errors.email
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-slate-500'
                                    }`}
                                />
                            </div>
                            <FieldError error={errors} field={'email'}/>
                        </div>
                        {/*// {Username Field}*/}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-900 mb-2"
                            >
                                username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    {...register('username')}
                                    type="text"
                                    id="username"
                                    placeholder="Enter username"
                                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-gray-50 ${
                                        errors.username
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-slate-500'
                                    }`}
                                />
                            </div>
                            <FieldError error={errors} field={'username'} />
                        </div>

                        {/*// {Password Field}*/}
                        < div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-900 mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className={"h-5 w-5 text-gray-400"} />
                                </div>
                                <input
                                    {...register('password')}
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Enter password"
                                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-gray-50 ${
                                        errors.password
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-slate-500'
                                    }`}
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
                                            <FieldError error={errors} field={'password'}/>
                                        </div>

                                        {/*// Password Confirm field*/}
                                        <div>
                                        <label
                                        htmlFor = "password-confirm"
                                        className ="block text-sm font-medium text-gray-900 mb-2"
                                        >
                                        Password Confirm
                                        </label>
                                        <div className = "relative">
                                            <div className = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" >
                                                <Lock className = "h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                    {...register('passwordConfirm')}
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="password-confirm"
                                    placeholder="Enter password"
                                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:border-transparent bg-gray-50 ${
                                        errors.passwordConfirm
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-slate-500'
                                    }`}
                                />
                                < button
                                    type="button"
                                    onClick={()=> setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400" />
                                                    ) :(
                                                    <Eye className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            < FieldError error={errors} field={'passwordConfirm'} />
                                        </div>

                                        {/*// Submit Button*/}
                                        < button
                                        type = "submit"
                                        className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-400 transition-colors duration-200"
                                        >
                                        Sign Up
                                        </button>

                                        {/*// 8*/}
                                        {/*// Success Message*/}

                                        <StatusMessage actionData={actionData} />
                                </Form>

                    {/*// Sign In Link*/}
                    <div className="mt-6 text-center">
                        <Link
                            to= "/sign-in"
                            className="text-sm text-gray-600 hover:text-gray-900 underline"
                        >
                     Already have an account ... Sign In
                </Link>
            </div>
        </div>
    </div>
</div>
);
}
