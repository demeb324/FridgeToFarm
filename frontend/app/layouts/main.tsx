import {Outlet, useLoaderData} from "react-router"
import Footer from "~/components/Footer";
import {Navigation} from "~/components/Navigation";
import {getSession} from "~/utils/session.server";
import type {Route} from "./+types/main";

export async function loader({request}: Route.LoaderArgs) {
    const session = await getSession(request.headers.get("Cookie"))
    return { isLoggedIn: session.has("user") }
}

export default function MainLayout() {
    const {isLoggedIn} = useLoaderData<typeof loader>()
    return (
        <>
            <Navigation isLoggedIn={isLoggedIn}/>
            <div className="pt-14">
                <Outlet/>
                <Footer />
            </div>
        </>
    )
}