import type {Route} from "./+types/home"
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
        {title: "Our Great Meals — Cook something great"},
        {name: "description", content: "Snap your fridge and discover recipes instantly."},
    ];
}

export async function action({request}: Route.ActionArgs) {
    const id = v4()
    let fileStored = false
    const uploadHandler = async (fileUpload: FileUpload) => {
        if (fileUpload.fieldName === "image" && fileUpload.type.startsWith("image/")) {
            await fileStorage.set(getStorageKey(id), fileUpload);
            fileStored = true
        }
    }
    await parseFormData(request, uploadHandler);
    if (!fileStored) {
        return {error: 'No image received — please select a file and try again.'}
    }
    return {uploadedId: id}
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024;

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

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        processFile(file, event.target);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

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

    useEffect(() => {
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [selectedFile]);

    const handleRemoveImage = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const {recipes, reviews} = loaderData

    return (
        <>
            {/* ── HERO ─────────────────────────────────────── */}
            <section className="text-center pt-20 pb-12 px-4">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-5">
                    Snap your fridge.<br />
                    Cook something <span className="text-amber-500">great.</span>
                </h1>
                <p className="text-gray-500 text-lg max-w-sm mx-auto mb-8 leading-relaxed">
                    Take a photo of what's in your fridge and we'll match it to hundreds of recipes — instantly.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <a
                        href="#upload"
                        className="px-5 py-2 border border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                        try it free <span aria-hidden>↗</span>
                    </a>
                    <Link
                        to="/meals"
                        className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        see example
                    </Link>
                </div>
            </section>

            {/* ── UPLOAD CARD ──────────────────────────────── */}
            <section id="upload" className="px-4 py-8 max-w-xl mx-auto">
                {uploadedId ? (
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative inline-block">
                            <img
                                src={`/api/image/${uploadedId}`}
                                alt="Uploaded"
                                className="max-w-sm max-h-80 rounded-xl border border-gray-200 object-contain"
                            />
                            <button
                                type="button"
                                onClick={() => setUploadedId(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                aria-label="Remove image"
                            >
                                ×
                            </button>
                        </div>
                        <Link
                            to={`/items-list/${uploadedId}`}
                            className="px-6 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                        >
                            Next: Review Ingredients →
                        </Link>
                    </div>
                ) : (
                    <Form method="POST" encType="multipart/form-data">
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center bg-white hover:border-amber-300 transition-colors">
                            {previewUrl ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative inline-block">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-w-[200px] max-h-[200px] rounded-xl border border-gray-200 object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                            aria-label="Remove Image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                                    >
                                        Upload Image
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Camera icon */}
                                    <label htmlFor="dropzone-file" className="cursor-pointer block"
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div className={[
                                            'flex flex-col items-center justify-center gap-3 transition-colors',
                                            isDragging ? 'opacity-60' : '',
                                        ].join(' ')}>
                                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">Upload a photo of your fridge</p>
                                                <p className="text-sm text-gray-400 mt-0.5">or drag and drop — we'll handle the rest</p>
                                            </div>
                                            <p className="text-xs text-amber-500 font-medium mt-1">AI-powered ingredient recognition</p>
                                        </div>
                                        <input
                                            type="file"
                                            id="dropzone-file"
                                            name="image"
                                            ref={fileInputRef}
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </>
                            )}
                        </div>

                        {actionData && 'error' in actionData && actionData.error && (
                            <p className="mt-3 text-sm text-red-600 text-center">{actionData.error}</p>
                        )}
                        {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
                    </Form>
                )}
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────── */}
            <section className="mt-20 px-4 md:px-16 max-w-5xl mx-auto">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-10">How it works</p>
                <div className="grid md:grid-cols-3 gap-10">
                    {[
                        {
                            n: '01',
                            title: 'Photograph your ingredients',
                            body: 'Open your fridge and take a quick photo. No need to list anything manually.',
                        },
                        {
                            n: '02',
                            title: 'We detect what you have',
                            body: 'Our model scans the image and identifies all the ingredients it can find.',
                        },
                        {
                            n: '03',
                            title: 'Get matched recipes',
                            body: 'Browse recipes that use exactly what you have — no extra shopping needed.',
                        },
                    ].map(step => (
                        <div key={step.n}>
                            <p className="text-amber-400 font-bold text-sm mb-2">{step.n}</p>
                            <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TOP RECIPES ──────────────────────────────── */}
            <section className="mt-20 mb-16 px-4 md:px-16 max-w-5xl mx-auto">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-10">Top recipes</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-8 justify-items-center">
                    {recipes.map((recipe: Recipe) => (
                        <RecipeCard recipe={recipe} key={recipe.id} reviews={reviews[recipe.id]} />
                    ))}
                </div>
            </section>
        </>
    )
}
