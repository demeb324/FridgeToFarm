import { Form } from "react-router";

export function AddFriend({ requestorId }: { requestorId: string }) {
    return (
        <Form method="post" className="relative my-8 mx-4 md:mx-16">
            <input type="hidden" name="intent" value="sendFriendRequest" />
            <input type="hidden" name="requestorId" value={requestorId} />
            <input
                type="email"
                name="email"
                required
                className="block w-full ps-9 pe-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                placeholder="Enter friend's email address"
            />
            <button
                type="submit"
                className="mt-6 text-white bg-amber-500 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
            >
                Send Request
            </button>
        </Form>
    );
}
