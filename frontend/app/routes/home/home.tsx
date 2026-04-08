import type {Route} from "./+types/home"
import {FileInput, Label} from "flowbite-react";
import {RecipeCard} from "~/components/recipeCard";
import {getAllRecipes} from "../../utils/models/recipe.model";
import {getRecipeReviews} from "~/utils/models/review.model";
import type {Recipe} from "~/utils/models/recipe.model";
import {Form, redirect, useActionData} from "react-router";
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
    const uploadHandler = async (fileUpload: FileUpload) => {

        if (
            fileUpload.fieldName === "image" &&
            fileUpload.type.startsWith("image/")
        ) {
            let storageKey = getStorageKey(id);

            // FileUpload objects are not meant to stick around for very long (they are
            // streaming data from the request.body); store them as soon as possible.
            await fileStorage.set(storageKey, fileUpload);

            // Return a File for the FormData object. This is a LazyFile that knows how
            // to access the file's content if needed (using e.g. file.stream()) but
            // waits until it is requested to actually read anything
        }
    }

    await parseFormData(
        request,
        uploadHandler
    );

console.log('i made it!')
    return redirect(`/items-list/${id}`)
    // 'avatar' has already been processed at this point
    // const file = formData.get("image");
    // console.log(file);


}

export async function loader() {
    const recipes: Recipe[] = await getAllRecipes()
    const reviewsMap = await getRecipeReviews(recipes)
    const reviews = Object.fromEntries(reviewsMap)
    return {recipes, reviews}

}

export default function Home({loaderData}: Route.ComponentProps) {
    const actionData = useActionData<typeof action>();

    // const {
    //     formState: {errors, isSubmitting},
    //     register,
    // } = useRemixForm<ImageCreation>({
    //     mode: "onSubmit",
    // });

    //image upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    //File validation constants
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024;//5 MB

    //Handle file selection
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        //Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Invalid file type. Please select JPEG, PNG, GIF, or WebP image.');
            event.target.value = '';
            return;
        }
        if (file.size > MAX_SIZE) {
            setError('Image too large. Maximum size is 5 MB.');
            event.target.value = '';
            return;
        }
        setError(null);
        setSelectedFile(file);
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

            <Form className="space-y-4 my-16" method="POST" encType="multipart/form-data">
                <div>
                    {selectedFile && (
                        <div className="relative inline-block mt-4">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-w-\[200\px] max-h-\[200\px] rounded-1g border border-gray-300"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                                aria-label="Remove Image">
                                X
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        name="image"
                        ref={fileInputRef}
                        accept="image/jpeg, image/png, image/gif, image/webp"
                        onChange={handleFileSelect}
                        // className="hidden"
                    />

                    <div className="flex justify-between items-center">
                        <button
                            type="submit"
                            // onClick={() => fileInputRef.current?.click()}
                            className="p-2">
                            Image Upload
                        </button>
                    </div>
                </div>

            </Form>

            <h2 className={'text-3xl text-center font-bold mb-8'}> Top Recipes </h2>

            <section className="mt-16">
                <div
                    className="grid md:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-16 justify-items-center md:container md:mx-auto mx-20">
                    {recipes.map((recipe: Recipe) => <RecipeCard recipe={recipe} key={recipe.id}
                                                                 reviews={reviews[recipe.id]}/>)}
                </div>
            </section>


        </>
    )
}
