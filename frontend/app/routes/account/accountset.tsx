import type { Route } from "./+types/accountset"
import { data, Form, redirect, useActionData } from "react-router";
import { getSession, commitSession } from "~/utils/session.server";
import { fileStorage, getAvatarStorageKey } from "~/utils/image-storage.server";
import { type FileUpload, parseFormData } from "@remix-run/form-data-parser";
import { useEffect, useRef, useState } from "react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Account Settings" },
        { name: "description", content: "Account Settings" },
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    if (!session.has("user")) {
        return redirect("/login?redirectTo=/accountset");
    }
    const user = session.get("user")!;
    const hasAvatar = await fileStorage.has(getAvatarStorageKey(user.id));
    return { user, hasAvatar };
}

export async function action({ request }: Route.ActionArgs) {
    const session = await getSession(request.headers.get("Cookie"));
    if (!session.has("user")) {
        return redirect("/login?redirectTo=/accountset");
    }
    const user = session.get("user")!;
    const storageKey = getAvatarStorageKey(user.id);

    // Delete requests are plain form posts without file upload
    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
        const formData = await request.formData();

        if (formData.get("intent") === "delete") {
            await fileStorage.remove(storageKey);
            return { success: true, message: "Profile picture deleted.", intent: "delete" };
        }

        if (formData.get("intent") === "update-profile") {
            const newBio = (formData.get("bio") as string)?.trim() || null;
            const response = await fetch(`${process.env.REST_API_URL}/user/update-profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Cookie: request.headers.get("Cookie") ?? "" },
                body: JSON.stringify({
                    bio: newBio,
                    currentPassword: formData.get("currentPassword"),
                    newPassword: formData.get("newPassword"),
                    confirmPassword: formData.get("confirmPassword"),
                }),
            });
            const result = await response.json();
            if (result.status === 200) {
                session.set("user", { ...user, bio: newBio });
                return data(
                    { success: true, message: "Profile updated successfully.", intent: "update-profile" },
                    { headers: { "Set-Cookie": await commitSession(session) } }
                );
            }
            return { error: result.message ?? "Failed to update profile.", intent: "update-profile" };
        }

        return { error: "Unknown action.", intent: "unknown" };
    }

    // Upload / replace
    let fileStored = false;
    const uploadHandler = async (fileUpload: FileUpload) => {
        if (
            fileUpload.fieldName === "avatar" &&
            fileUpload.type.startsWith("image/")
        ) {
            await fileStorage.set(storageKey, fileUpload);
            fileStored = true;
        }
    };
    await parseFormData(request, uploadHandler);

    if (!fileStored) {
        return { error: "No image received — please select a file and try again.", intent: "avatar" };
    }
    return { success: true, message: "Profile picture updated.", intent: "avatar" };
}

export default function AccountSet({ loaderData }: Route.ComponentProps) {
    const { user, hasAvatar } = loaderData;
    const actionData = useActionData<typeof action>();

    // Cache-busting token so the <img> refetches after uploads/deletes
    const [avatarVersion, setAvatarVersion] = useState(1);
    const [showAvatar, setShowAvatar] = useState(hasAvatar);

    // Upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [clientError, setClientError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    useEffect(() => {
        setShowAvatar(hasAvatar);
    }, [hasAvatar]);

    useEffect(() => {
        if (actionData && "success" in actionData && actionData.success) {
            setAvatarVersion(Date.now());
            setSelectedFile(null);
            setPreviewUrl("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [actionData]);

    useEffect(() => {
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [selectedFile]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!ALLOWED_TYPES.includes(file.type)) {
            setClientError("Invalid file type. Please select JPEG, PNG, GIF, or WebP.");
            event.target.value = "";
            return;
        }
        if (file.size > MAX_SIZE) {
            setClientError("Image too large. Maximum size is 5 MB.");
            event.target.value = "";
            return;
        }
        setClientError(null);
        setSelectedFile(file);
    };

    const handleClearSelection = () => {
        setSelectedFile(null);
        setPreviewUrl("");
        setClientError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const processDroppedFile = (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            setClientError("Invalid file type. Please select JPEG, PNG, GIF, or WebP.");
            return;
        }
        if (file.size > MAX_SIZE) {
            setClientError("Image too large. Maximum size is 5 MB.");
            return;
        }
        setClientError(null);
        setSelectedFile(file);
        if (fileInputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInputRef.current.files = dt.files;
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        processDroppedFile(file);
    };

    return(
        <>
            <h1 className="my-8 text-center font-bold text-4xl">Account Settings</h1>

            <h2 className="mx-16 mb-4 font-bold text-xl">My profile:</h2>

            <div className="mx-16">
                <div className="flex items-start gap-6 mb-4">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-40 h-40 object-cover rounded-lg border border-gray-300 flex-shrink-0"
                        />
                    ) : showAvatar ? (
                        <img
                            src={`/api/avatar/${user.id}?v=${avatarVersion}`}
                            alt="Profile picture"
                            className="w-40 h-40 object-cover rounded-lg border border-gray-300 flex-shrink-0"
                            onError={() => setShowAvatar(false)}
                        />
                    ) : (
                        <label
                            htmlFor="avatar-file"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={[
                                "w-40 h-40 flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors flex-shrink-0 text-center px-2",
                                isDragging
                                    ? "border-blue-400 bg-blue-50"
                                    : "border-gray-300 bg-gray-50 hover:bg-gray-100",
                            ].join(" ")}
                        >
                            <svg className="mb-2 h-7 w-7 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="text-xs text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                        </label>
                    )}

                    <div className="flex flex-col gap-3">
                        <Form method="post" encType="multipart/form-data" className="flex flex-col gap-3">
                            <input
                                type="file"
                                id="avatar-file"
                                name="avatar"
                                ref={fileInputRef}
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {selectedFile && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleClearSelection}
                                        className="text-sm text-gray-600 hover:text-gray-800 underline self-start"
                                    >
                                        Clear selection
                                    </button>
                                    <button
                                        type="submit"
                                        className="text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none self-start">
                                        Save Picture
                                    </button>
                                </>
                            )}
                        </Form>

                        {showAvatar && !selectedFile && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none self-start">
                                    Edit Picture
                                </button>
                                <Form method="post">
                                    <input type="hidden" name="intent" value="delete" />
                                    <button
                                        type="submit"
                                        className="text-white bg-red-600 box-border border border-transparent hover:bg-red-700 focus:ring-4 focus:ring-red-300 shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none self-start">
                                        Delete Picture
                                    </button>
                                </Form>
                            </>
                        )}

                        {clientError && <p className="text-sm text-red-600">{clientError}</p>}
                        {actionData && "error" in actionData && actionData.error &&
                         (!("intent" in actionData) || actionData.intent === "avatar" || actionData.intent === "delete") && (
                            <p className="text-sm text-red-600">{actionData.error}</p>
                        )}
                    </div>
                </div>

                <table className="table-auto my-4">
                    <tbody>
                        <tr>
                            <td className="font-bold align-top pr-4 py-1">Username:</td>
                            <td className="py-1">{user.username}</td>
                        </tr>
                        <tr>
                            <td className="font-bold align-top pr-4 py-1">Joined:</td>
                            <td className="py-1">
                                {user.createdAt
                                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })
                                    : "—"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mx-16 mb-16">
                <Form method="post" className="flex flex-col gap-0">
                    <input type="hidden" name="intent" value="update-profile" />

                    <h2 className="mt-8 font-bold text-xl">Bio</h2>
                    <div className="my-4 pr-200">
                        <textarea
                            name="bio"
                            rows={4}
                            defaultValue={user.bio ?? ""}
                            maxLength={512}
                            className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body resize-y"
                            placeholder="Tell us a little about yourself…"
                        />
                    </div>

                    <h2 className="mt-8 font-bold text-xl">Change Password</h2>
                    <p className="text-sm text-gray-500 mb-2">Leave blank to keep your current password.</p>

                    <div className="relative my-4 pr-200">
                        <input type="password" name="currentPassword"
                               className="block w-full ps-3 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                               placeholder="Current Password"/>
                    </div>

                    <div className="relative my-4 pr-200">
                        <input type="password" name="newPassword"
                               className="block w-full ps-3 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                               placeholder="New Password"/>
                    </div>

                    <div className="relative my-4 pr-200">
                        <input type="password" name="confirmPassword"
                               className="block w-full ps-3 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                               placeholder="Re-type New Password"/>
                    </div>

                    {actionData && "intent" in actionData && actionData.intent === "update-profile" && (
                        <>
                            {"error" in actionData && actionData.error && (
                                <p className="text-sm text-red-600 mb-2">{actionData.error}</p>
                            )}
                            {"success" in actionData && actionData.success && (
                                <p className="text-sm text-green-600 mb-2">{actionData.message}</p>
                            )}
                        </>
                    )}

                    <button type="submit"
                            className="text-white mt-4 bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none self-start">
                        Save
                    </button>
                </Form>
            </div>

        </>
    )
}
