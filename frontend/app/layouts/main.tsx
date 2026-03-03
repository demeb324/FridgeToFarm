import {Outlet} from "react-router"
import Footer from "~/components/Footer";
import {Navigation} from "~/components/Navigation";

export default function MainLayout() {
    return (
        <>
        <Navigation/>
        <Outlet/>
            <Footer />
        </>
    )
}