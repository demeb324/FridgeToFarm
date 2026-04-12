import type {Route} from "./+types/home"
import {Label} from "flowbite-react";
import {RecipeCard} from "~/components/recipeCard";
import {getAllRecipes} from "../../utils/models/recipe.model";
import {getRecipeReviews} from "~/utils/models/review.model";
import type {Recipe} from "~/utils/models/recipe.model";
import {Form, Link, useActionData} from "react-router";
import {useEffect, useRef, useState} from "react";
import {
    type FileUpload,
    parseFormData,
} from "@remix-run/form-data-parser";
import {fileStorage, getStorageKey} from "~/utils/image-storage.server";
import {v4} from "uuid";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "New React Router App"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export async function action({
                                 request,
                             }: Route.ActionArgs) {
    const id = v4()
    let fileStored = false
    const uploadHandler = async (fileUpload: FileUpload) => {
        if (
            fileUpload.fieldName === "image" &&
            fileUpload.type.startsWith("image/")
        ) {
            await fileStorage.set(getStorageKey(id), fileUpload);
            fileStored = true
        }
    }

    await parseFormData(request, uploadHandler);

    if (!fileStored) {
        return { error: 'No image received — please select a file and try again.' }
    }

    return { uploadedId: id }


}

export async function loader() {
    const recipes: Recipe[] = await getAllRecipes()
    const reviewsMap = await getRecipeReviews(recipes)
    const reviews = Object.fromEntries(reviewsMap)
    return {recipes, reviews}

}

export default function Home({loaderData}: Route.ComponentProps) {
    const actionData = useActionData<typeof action>();
    const [uploadedId, setUploadedId] = useState<string | null>(null);

    useEffect(() => {
        if (actionData && 'uploadedId' in actionData && actionData.uploadedId) {
            setUploadedId(actionData.uploadedId);
            setSelectedFile(null);
            setPreviewUrl('');
        }
    }, [actionData]);

    //image upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    //File validation constants
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024;//5 MB

    const processFile = (file: File, inputEl?: HTMLInputElement | null) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Invalid file type. Please select JPEG, PNG, GIF, or WebP image.');
            if (inputEl) inputEl.value = '';
            return;
        }
        if (file.size > MAX_SIZE) {
            setError('Image too large. Maximum size is 5 MB.');
            if (inputEl) inputEl.value = '';
            return;
        }
        setError(null);
        setSelectedFile(file);
    };

    //Handle file selection
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        processFile(file, event.target);
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
        processFile(file);
        if (fileInputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInputRef.current.files = dt.files;
        }
    };

    //Create preview
    useEffect(() => {
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [selectedFile]);

    //Remove image
    const handleRemoveImage = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    const {recipes, reviews} = loaderData

    return (
        <>

            {uploadedId ? (
                <div className="my-16 flex flex-col items-center gap-6">
                    <div className="relative inline-block">
                        <img
                            src={`/api/image/${uploadedId}`}
                            alt="Uploaded"
                            className="max-w-sm max-h-80 rounded-lg border border-gray-300 object-contain"
                        />
                        <button
                            type="button"
                            onClick={() => setUploadedId(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                            aria-label="Remove image">
                            ×
                        </button>
                    </div>
                    <Link
                        to={`/items-list/${uploadedId}`}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Next: Review Ingredients
                    </Link>
                </div>
            ) : (
                <Form className="flex flex-col items-center space-y-4 my-16" method="POST" encType="multipart/form-data">
                    <div className="flex flex-col items-center w-full max-w-lg">
                        {previewUrl && (
                            <div className="relative inline-block mt-4 mb-4">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                    aria-label="Remove Image">
                                    ×
                                </button>
                            </div>
                        )}

                        {/* File input is always in the DOM so it's always included in form submission */}
                        <input
                            type="file"
                            id="dropzone-file"
                            name="image"
                            ref={fileInputRef}
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {!previewUrl && <div className="flex w-full items-center justify-center w-full">
                            <Label
                                htmlFor="dropzone-file"
                                className={[
                                    'flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
                                    isDragging
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
                                ].join(' ')}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                                    <svg className="mb-4 h-8 w-8 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">JPEG, PNG, GIF, WebP (max 5 MB)</p>
                                </div>
                            </Label>
                        </div>}

                        {actionData && 'error' in actionData && actionData.error && (
                            <p className="mt-2 text-sm text-red-600">{actionData.error}</p>
                        )}
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                        <div className="flex justify-center mt-4">
                            <button
                                type="submit"
                                disabled={!previewUrl}
                                suppressHydrationWarning
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                Upload Image
                            </button>
                        </div>
                    </div>
                </Form>
            )}

            <h2 className={'text-3xl text-center font-bold mb-8'}> Top Recipes </h2>

            <section className="mt-16">
                <div
                    className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-8 md:gap-16 justify-items-center md:container md:mx-auto mx-4">
                    {recipes.map((recipe: Recipe) => <RecipeCard recipe={recipe} key={recipe.id}
                                                                 reviews={reviews[recipe.id]}/>)}
                </div>
            </section>


        </>
    )
}
