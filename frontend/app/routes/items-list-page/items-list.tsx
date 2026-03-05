import {FileInput, Label} from "flowbite-react";

export default function ItemsList() {

return (
    <>
        <div className="flex w-full items-center justify-center">
            <Label
                htmlFor="dropzone-file"
                className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600 my-16 mx-44"
            >
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <svg
                        className="mb-4 h-8 w-8 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                </div>
                <FileInput id="dropzone-file" className="hidden"/>
            </Label>
        </div>
        <h2 className="mx-16 mb-4 font-bold text-2xl">
            List of items on the picture
        </h2>
        <div className="mx-16 text-left">
            <ul className="list-none">
                <li>chicken</li>
                <li>tomatoes</li>
                <li>onion</li>
                <li>cheese</li>
            </ul>
        </div>
        <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
            Is this Everything? Add items:
        </h2>
        <ul className="mx-16 list-none">
            <li>salt</li>
            <li>cucumber</li>
        </ul>
        <div className="mx-16">
        <form className="pr-96">
            <select id="items"
                    className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                <option selected>Choose an item</option>
                <option value="milk">milk</option>
                <option value="CA">beer</option>
                <option value="FR">swiss cheese</option>
                <option value="DE">brats</option>
            </select>
        </form>
        <button type="button"
                className="mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Add
        </button>
        </div>
        <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
            What type of meal do you want to eat?
        </h2>
        <div className="mx-16">
            <form className="pr-96">
                <select id="items"
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                    <option selected>Choose an item</option>
                    <option value="milk">breakfast</option>
                    <option value="CA">lunch</option>
                    <option value="FR">dinner</option>
                    <option value="DE">desert</option>
                </select>
            </form>
        </div>
        <h2 className="mx-16 mb-4 mt-8 font-bold text-2xl">
            What cuisines do you like to experience?
        </h2>
        <div className="mx-16">
            <form className="pr-96">
                <select id="items"
                        className="mt-4 block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                    <option selected>Choose an item</option>
                    <option value="milk">Chinese</option>
                    <option value="CA">Mexican</option>
                    <option value="FR">Middle Eastern</option>
                    <option value="DE">Barbeque</option>
                </select>
            </form>
            <button type="button"
                    className="mb-28 mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Next
            </button>
        </div>

    </>
)
}