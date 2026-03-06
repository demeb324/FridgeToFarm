import React from 'react';


export function AddFriend()  {
    return (
        <div className="relative my-8 mx-16 pr-80">
            <input type="text" id="input-group-1"
                   className="block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                   placeholder="Search Friend"/>
            {/*this code came from one of the challenges */}
            <button type="button"
                    className="mt-6 text-white bg-blue-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Send Request
            </button>
        </div>
    );
}