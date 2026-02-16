/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nnc: {
                    base: '#0f0f0f',      // Main background
                    surface: '#161616',   // Cards/Panels
                    subtle: '#262626',    // Borders/Dividers
                    primary: '#eaeaea',   // Main text
                    muted: '#888888',     // Secondary text
                },
                accent: {
                    tech: '#00ff41',      // Success/Active states
                    action: '#ff5f00',    // Primary Buttons (Skapa Möte)
                },
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
                sans: ['"Inter"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
