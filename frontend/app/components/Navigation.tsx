import {
    Dropdown,
    MegaMenu,
    MegaMenuDropdown,
    Navbar,
    NavbarBrand,
    NavbarCollapse,
    NavbarLink,
    NavbarToggle
} from "flowbite-react";

export function Navigation() {
    return (
        <Navbar fluid rounded className={'border-6 border-gray-200 bg-gray-100'}>
            <NavbarBrand href="/">
                <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Our Great Meals</span>
            </NavbarBrand>
            <NavbarToggle />
            <NavbarCollapse>
                {/*<NavbarLink href="/recipe">Recipes</NavbarLink>*/}
                <NavbarLink href="/meals">Meals</NavbarLink>
                <NavbarLink href="/login">Login/New Account</NavbarLink>
                <NavbarLink href="/allfriends">Friends</NavbarLink>
                <NavbarLink href="#">Saved Recipes</NavbarLink>
                <Dropdown arrowIcon={true}
                          inline
                          label={
                              'My Account'
                          }>
                    <ul className="grid grid-cols-1">
                        <div className="space-y-4 p-4">
                            <li>
                                <a href='/accountset' className="hover:text-primary-600 dark:hover:text-primary-500">
                                    Settings
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary-600 dark:hover:text-primary-500">
                                    Logout
                                </a>
                            </li>
                        </div>
                    </ul>
                </Dropdown>
            </NavbarCollapse>
        </Navbar>
    );
}