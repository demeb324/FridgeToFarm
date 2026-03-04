import React from 'react';


export function AddFriend()  {
    return (
        <div>
            <input
            type="email"
            placeholder="Enter Friend's Email"
            className="border p-2 rounded"
        />
            {/*this code came from one of the challenges */}
            <button
                type="button"
                className="text-white bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none font-medium rounded text-sm px-4 py-2.5">
                Send Request
            </button>
        </div>
    );
}