/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Anton', 'Impact', 'sans-serif'],
        body: ['Chivo', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        cream: '#F7F5F0',
        ink: '#0A0A0A',
        brick: '#E23D28',
        mustard: '#EAA81B',
        teal: '#12515B',
        newsprint: '#E2DDCF',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        'retro': '6px 6px 0px #0A0A0A',
        'retro-sm': '4px 4px 0px #0A0A0A',
        'retro-lg': '10px 10px 0px #0A0A0A',
        'retro-mustard': '6px 6px 0px #EAA81B',
        'retro-brick': '6px 6px 0px #E23D28',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'blink': { '0%, 50%': { opacity: '1' }, '51%, 100%': { opacity: '0.3' } },
        'marquee': { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } },
        'stamp-in': { '0%': { transform: 'scale(3) rotate(-15deg)', opacity: '0' }, '100%': { transform: 'scale(1) rotate(-4deg)', opacity: '1' } },
        'ball-roll': { '0%': { transform: 'rotate(0deg) translateX(0)' }, '100%': { transform: 'rotate(720deg) translateX(40px)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'blink': 'blink 1s infinite',
        'marquee': 'marquee 40s linear infinite',
        'stamp-in': 'stamp-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'ball-roll': 'ball-roll 1.5s linear infinite',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
