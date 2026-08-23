import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Bai Jamjuree', 'system-ui', 'sans-serif'],
        display: ['Bai Jamjuree', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sales: {
          DEFAULT: "hsl(var(--sales))",
          glow: "hsl(var(--sales-glow))",
        },
        finance: {
          DEFAULT: "hsl(var(--finance))",
          glow: "hsl(var(--finance-glow))",
        },
        hr: {
          DEFAULT: "hsl(var(--hr))",
          glow: "hsl(var(--hr-glow))",
        },
        tech: {
          DEFAULT: "hsl(var(--tech))",
          glow: "hsl(var(--tech-glow))",
        },
        support: {
          DEFAULT: "hsl(var(--support))",
          glow: "hsl(var(--support-glow))",
        },
        marketing: {
          DEFAULT: "hsl(var(--marketing))",
          glow: "hsl(var(--marketing-glow))",
        },
        role: {
          admin: "hsl(var(--role-admin))",
          manager: "hsl(var(--role-manager))",
          employee: "hsl(var(--role-employee))",
          foreground: "hsl(var(--role-foreground))",
        },
        management: {
          DEFAULT: "hsl(var(--management))",
          glow: "hsl(var(--management-glow))",
        },
        employee: {
          DEFAULT: "hsl(var(--employee))",
          glow: "hsl(var(--employee-glow))",
        },
        legal: {
          DEFAULT: "hsl(var(--legal))",
        },
        renewals: {
          DEFAULT: "hsl(var(--renewals))",
        },
        glass: {
          bg: "hsl(var(--glass-bg))",
          border: "hsl(var(--glass-border))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },
      boxShadow: {
        "elevation-low": "var(--shadow-elevation-low)",
        "elevation-medium": "var(--shadow-elevation-medium)",
        "elevation-high": "var(--shadow-elevation-high)",
        "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        "glass-lg": "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        "inner-light": "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)",
        "3d": "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
        "3d-hover": "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.3)",
      },
      backdropBlur: {
        xs: "2px",
        glass: "20px",
        "glass-lg": "30px",
      },
      keyframes: {
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },

        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-3d": {
          "0%, 100%": { transform: "translateY(0px) rotateX(0deg) rotateY(0deg)" },
          "25%": { transform: "translateY(-10px) rotateX(2deg) rotateY(-2deg)" },
          "50%": { transform: "translateY(-5px) rotateX(0deg) rotateY(2deg)" },
          "75%": { transform: "translateY(-15px) rotateX(-2deg) rotateY(0deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.5), 0 0 60px rgba(99, 102, 241, 0.3)" },
        },
        "shimmer": {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        "holographic": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "progress-slide": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        indeterminate: "indeterminate 1.1s ease-in-out infinite",

        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "float-3d": "float-3d 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "holographic": "holographic 8s ease infinite",
        "progress-slide": "progress-slide 1.1s ease-in-out infinite",

      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
