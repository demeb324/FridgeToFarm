export function Logo({ size = 38 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Our Great Meals"
        >
            <defs>
                <clipPath id="logo-clip">
                    <circle cx="20" cy="20" r="20"/>
                </clipPath>
                <linearGradient id="logo-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fb923c"/>
                    <stop offset="100%" stopColor="#ea580c"/>
                </linearGradient>
            </defs>

            <g clipPath="url(#logo-clip)">
                {/* Orange circle background */}
                <circle cx="20" cy="20" r="20" fill="url(#logo-bg)"/>

                {/* Camera body */}
                <rect x="6" y="14" width="28" height="15" rx="2.5" fill="white" fillOpacity="0.95"/>

                {/* Viewfinder bump */}
                <rect x="15" y="11" width="7" height="4" rx="1.5" fill="white" fillOpacity="0.95"/>

                {/* Flash dot */}
                <circle cx="9.5" cy="17" r="1.3" fill="#fb923c"/>

                {/* Lens — outer dark ring */}
                <circle cx="20" cy="21.5" r="5.8" fill="#1f2937"/>
                {/* Lens — orange */}
                <circle cx="20" cy="21.5" r="4.2" fill="#f97316"/>
                {/* Lens — inner darker */}
                <circle cx="20" cy="21.5" r="2.2" fill="#c2410c"/>
                {/* Lens — highlight */}
                <circle cx="18.3" cy="19.8" r="0.9" fill="white" fillOpacity="0.6"/>

                {/* Fork — left */}
                <line x1="12" y1="30" x2="12" y2="34" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="14" y1="30" x2="14" y2="34" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="16" y1="30" x2="16" y2="34" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M12 34 Q14 36 16 34" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="14" y1="35.5" x2="14" y2="42" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>

                {/* Spoon — right */}
                <ellipse cx="27" cy="31.5" rx="2.5" ry="3" fill="white"/>
                <line x1="27" y1="34.5" x2="27" y2="42" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </g>
        </svg>
    )
}
