import {useState} from "react";
import {Form} from "react-router";
import {Logo} from "~/components/Logo";

type NavigationProps = { isLoggedIn: boolean }

export function Navigation({isLoggedIn}: NavigationProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">

                {/* ── Logo ── */}
                <a href="/" className="flex items-center gap-2.5 shrink-0">
                    <Logo size={28} />
                    <span className="font-bold text-gray-900 text-sm">
                        Our <span className="text-amber-500">Great</span> Meals
                    </span>
                </a>

                {/* ── Center links (desktop) ── */}
                <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
                    <a href="/#upload" className="hover:text-gray-900 transition-colors">how it works</a>
                    <a href="/meals" className="hover:text-gray-900 transition-colors">meals</a>
                    {isLoggedIn && (
                        <>
                            <a href="/allfriends" className="hover:text-gray-900 transition-colors">friends</a>
                            <a href="/saved-recipes" className="hover:text-gray-900 transition-colors">saved recipes</a>
                        </>
                    )}
                </div>

                {/* ── Right side (desktop) ── */}
                <div className="hidden md:flex items-center gap-4">
                    {!isLoggedIn ? (
                        <>
                            <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                                sign in
                            </a>
                            <a href="/login" className="px-4 py-1.5 border border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                get started
                            </a>
                        </>
                    ) : (
                        <div className="relative">
                            <button
                                onClick={() => setAccountOpen(o => !o)}
                                className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                                my account
                                <svg className={`w-3 h-3 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {accountOpen && (
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
                                    <a
                                        href="/accountset"
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                                        onClick={() => setAccountOpen(false)}
                                    >
                                        Settings
                                    </a>
                                    <Form method="post" action="/logout">
                                        <button
                                            type="submit"
                                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                                        >
                                            Logout
                                        </button>
                                    </Form>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Hamburger (mobile) ── */}
                <button
                    className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileOpen(o => !o)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* ── Mobile menu ── */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4 text-sm text-gray-600">
                    <a href="/#upload" className="hover:text-gray-900" onClick={() => setMobileOpen(false)}>how it works</a>
                    <a href="/meals" className="hover:text-gray-900" onClick={() => setMobileOpen(false)}>meals</a>
                    {isLoggedIn && (
                        <>
                            <a href="/allfriends" className="hover:text-gray-900" onClick={() => setMobileOpen(false)}>friends</a>
                            <a href="/saved-recipes" className="hover:text-gray-900" onClick={() => setMobileOpen(false)}>saved recipes</a>
                            <a href="/accountset" className="hover:text-gray-900" onClick={() => setMobileOpen(false)}>settings</a>
                            <Form method="post" action="/logout">
                                <button type="submit" className="text-left text-gray-600 hover:text-gray-900">logout</button>
                            </Form>
                        </>
                    )}
                    {!isLoggedIn && (
                        <a href="/login" className="font-medium border border-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                            get started
                        </a>
                    )}
                </div>
            )}
        </nav>
    );
}
