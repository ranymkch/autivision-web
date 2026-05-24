# Autivision — Full Implementation Specification
> **For Claude Code**: This file is self-contained. Build the entire Next.js site by following each section in order. No guessing required.

---

# 1. Project Overview

## Purpose
Autivision is an AI-powered vision and innovation platform. The website is a marketing/landing site targeting enterprise and startup SaaS buyers. It communicates technological capability, trust, and forward momentum through bold editorial design.

## Core UX Structure
- **Single-page feel** with full-viewport sections that scroll sequentially
- **Sticky navigation** that transitions from transparent to frosted-glass on scroll
- **Hero**: Large typographic statement + animated visual + dual CTA
- **Marquee strip**: Scrolling logos of partner/integration brands
- **Feature showcase**: Alternating image+text bento-style panels
- **Stats bar**: Animated counters (key metrics)
- **Mission/About section**: Editorial layout with large pull-quote
- **Team grid**: Cards with hover reveal
- **Timeline**: Vertical milestone scroll
- **Testimonials**: Horizontal scroll carousel
- **CTA band**: Full-width dark call to action
- **Footer**: Multi-column links + newsletter + legal

## Site Pages
| Route | Purpose |
|---|---|
| `/` | Main landing |
| `/about` | Mission, values, story |
| `/team` | People grid |
| `/contact` | Contact form + office info |

---

# 2. Tech Stack

```
Framework:     Next.js 14 (App Router)
Styling:       Tailwind CSS v3
Animation:     Framer Motion v11
UI Primitives: shadcn/ui (select components)
Icons:         Lucide React
Fonts:         next/font (local or Google)
  - Display:   "Syne" (bold editorial headlines)
  - Body:      "DM Sans" (clean, modern readability)
Forms:         React Hook Form + Zod
Deployment:    Vercel (assumed)
```

---

# 3. Folder Structure

```
autivision/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata, navbar, footer)
│   ├── page.tsx                # Home page
│   ├── about/
│   │   └── page.tsx
│   ├── team/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── globals.css
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── MarqueeStrip.tsx
│   │   ├── FeatureSection.tsx
│   │   ├── StatsBar.tsx
│   │   ├── MissionSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── CTABand.tsx
│   ├── about/
│   │   ├── AboutHero.tsx
│   │   ├── ValuesGrid.tsx
│   │   └── TimelineSection.tsx
│   ├── team/
│   │   ├── TeamHero.tsx
│   │   └── TeamGrid.tsx
│   ├── contact/
│   │   ├── ContactHero.tsx
│   │   └── ContactForm.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── SectionLabel.tsx
│       ├── AnimatedCounter.tsx
│       └── RevealOnScroll.tsx
│
├── lib/
│   ├── utils.ts
│   └── data/
│       ├── team.ts
│       ├── features.ts
│       ├── testimonials.ts
│       └── timeline.ts
│
├── public/
│   ├── images/
│   │   ├── hero-visual.svg
│   │   └── (feature images, team headshots)
│   └── fonts/ (if self-hosting)
│
├── styles/
│   └── (globals handled in app/globals.css)
│
├── tailwind.config.ts
├── next.config.ts
└── tsconfig.json
```

---

# 4. Routing Plan

```
/           → Home (all sections stacked)
/about      → Story, values, timeline
/team       → Team member cards grid
/contact    → Contact form + info
```

All routes use the root layout (Navbar + Footer).

---

# 5. Layout System

## Root Layout — `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Autivision — AI-Powered Vision Platform",
  description:
    "Autivision transforms how enterprises see, decide, and act with cutting-edge AI vision intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-av-bg text-av-text font-dm antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

## Navbar Structure

- Fixed top, `z-50`
- On mount: transparent bg with white text
- On scroll > 60px: `backdrop-blur-md bg-av-bg/80 border-b border-white/10`
- Left: Logo (wordmark "AUTIVISION" in Syne bold)
- Center: Nav links (About, Team, Contact, Blog)
- Right: "Get Early Access" button (pill, accent color)
- Mobile: hamburger → full-screen slide-down overlay menu

## Footer Structure

- Dark background `bg-av-dark`
- 4-column grid: Brand | Product | Company | Connect
- Below: newsletter email input + subscribe button
- Very bottom: copyright + legal links (Privacy, Terms)
- Subtle top border `border-t border-white/10`

---

# 6. Design System

## Colors

```ts
// tailwind.config.ts — extend.colors
colors: {
  av: {
    bg:       "#0A0A0F",   // near-black, primary background
    dark:     "#060608",   // footer / deepest dark
    surface:  "#12121A",   // card backgrounds
    border:   "#1E1E2E",   // subtle borders
    accent:   "#4FFFA4",   // electric mint-green — primary accent
    accent2:  "#A78BFA",   // violet — secondary accent
    text:     "#F0F0F5",   // primary text
    muted:    "#7070A0",   // secondary / muted text
    white:    "#FFFFFF",
  },
},
```

## Typography

```ts
fontFamily: {
  syne: ["var(--font-syne)", "sans-serif"],
  dm:   ["var(--font-dm)", "sans-serif"],
},
fontSize: {
  // Custom display sizes
  "display-xl": ["clamp(3.5rem, 8vw, 8rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
  "display-lg": ["clamp(2.5rem, 5vw, 5rem)",  { lineHeight: "1.0",  letterSpacing: "-0.03em" }],
  "display-md": ["clamp(1.75rem, 3vw, 3rem)", { lineHeight: "1.1",  letterSpacing: "-0.02em" }],
},
```

## Spacing

Uses Tailwind defaults. Key custom tokens:
```ts
spacing: {
  section: "120px",   // vertical padding between major sections
  "section-sm": "80px",
},
```

## Grid System

- 12-column grid: `grid grid-cols-12 gap-6`
- Max content width: `max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16`
- Wrapper utility class: `container-av` (add to globals.css)

```css
/* globals.css */
@layer utilities {
  .container-av {
    @apply max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16;
  }
  .section-pad {
    @apply py-24 md:py-32 lg:py-40;
  }
}
```

## Full `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        av: {
          bg:      "#0A0A0F",
          dark:    "#060608",
          surface: "#12121A",
          border:  "#1E1E2E",
          accent:  "#4FFFA4",
          accent2: "#A78BFA",
          text:    "#F0F0F5",
          muted:   "#7070A0",
          white:   "#FFFFFF",
        },
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        dm:   ["var(--font-dm)", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(3.5rem, 8vw, 8rem)",  { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-lg": ["clamp(2.5rem, 5vw, 5rem)",  { lineHeight: "1.0",  letterSpacing: "-0.03em" }],
        "display-md": ["clamp(1.75rem, 3vw, 3rem)", { lineHeight: "1.1",  letterSpacing: "-0.02em" }],
      },
      spacing: {
        section:    "120px",
        "section-sm": "80px",
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        "glow-green":   "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(79,255,164,0.15), transparent)",
        "glow-violet":  "radial-gradient(ellipse 50% 40% at 80% 50%, rgba(167,139,250,0.12), transparent)",
      },
      backgroundSize: {
        "grid": "60px 60px",
      },
      animation: {
        marquee:  "marquee 30s linear infinite",
        "fade-up": "fade-up 0.6s ease forwards",
        glow:     "glow 3s ease-in-out infinite alternate",
      },
      keyframes: {
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%":   { opacity: "0.6" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

# 7. Component Architecture

---

## 7.1 `components/ui/Button.tsx`

**Purpose**: Reusable CTA button with three variants.

**Props**:
```ts
interface ButtonProps {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}
```

**Code**:
```tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-av-accent text-av-bg font-semibold hover:bg-av-accent/90 shadow-[0_0_24px_rgba(79,255,164,0.25)]",
  outline: "border border-av-accent text-av-accent hover:bg-av-accent/10",
  ghost:   "text-av-text hover:text-av-accent",
};
const sizes = {
  sm: "px-4 py-2 text-sm rounded-full",
  md: "px-6 py-3 text-base rounded-full",
  lg: "px-8 py-4 text-lg rounded-full",
};

export function Button({ variant = "primary", size = "md", children, href, onClick, className }: ButtonProps) {
  const cls = cn(
    "inline-flex items-center gap-2 transition-all duration-200 font-dm",
    variants[variant],
    sizes[size],
    className
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}
```

---

## 7.2 `components/ui/SectionLabel.tsx`

**Purpose**: Small eyebrow label above section headings.

**Props**: `{ label: string; className?: string }`

```tsx
import { cn } from "@/lib/utils";

export function SectionLabel({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-av-accent font-dm",
      className
    )}>
      <span className="w-4 h-px bg-av-accent" />
      {label}
      <span className="w-4 h-px bg-av-accent" />
    </span>
  );
}
```

---

## 7.3 `components/ui/RevealOnScroll.tsx`

**Purpose**: Wraps children with Framer Motion scroll-triggered fade-up.

**Props**: `{ children; delay?: number; className?: string }`

```tsx
"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function RevealOnScroll({ children, delay = 0, className }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
```

---

## 7.4 `components/ui/AnimatedCounter.tsx`

**Purpose**: Counts up to a number when scrolled into view.

**Props**: `{ to: number; suffix?: string; duration?: number }`

```tsx
"use client";
import { useInView, useMotionValue, useSpring, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedCounter({ to, suffix = "", duration = 2 }: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (isInView) motionVal.set(to);
  }, [isInView, motionVal, to]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{springVal}</motion.span>
      {suffix}
    </span>
  );
}
```

---

## 7.5 `components/layout/Navbar.tsx`

**Purpose**: Sticky top navigation with scroll transparency transition.

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "About",   href: "/about"   },
  { label: "Team",    href: "/team"    },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "backdrop-blur-md bg-av-bg/80 border-b border-white/10" : "bg-transparent"
    )}>
      <div className="container-av flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link href="/" className="font-syne font-bold text-xl tracking-tight text-av-text">
          AUTIVISION
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-av-muted hover:text-av-text transition-colors font-dm"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:block">
          <Button href="/contact" size="sm">Get Early Access</Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-av-text"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-av-bg border-b border-av-border px-6 pb-8 pt-4 space-y-6"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block text-lg font-syne font-semibold text-av-text hover:text-av-accent"
              >
                {l.label}
              </Link>
            ))}
            <Button href="/contact" className="w-full justify-center">Get Early Access</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
```

---

## 7.6 `components/layout/Footer.tsx`

```tsx
import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      { label: "Features",    href: "#features" },
      { label: "Pricing",     href: "#" },
      { label: "Changelog",   href: "#" },
      { label: "Roadmap",     href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",   href: "/about"   },
      { label: "Team",    href: "/team"    },
      { label: "Blog",    href: "#"        },
      { label: "Careers", href: "#"        },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Twitter",  href: "#" },
      { label: "LinkedIn", href: "#" },
      { label: "GitHub",   href: "#" },
      { label: "Contact",  href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-av-dark border-t border-white/10">
      <div className="container-av py-20">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <p className="font-syne font-bold text-xl text-av-text">AUTIVISION</p>
            <p className="text-av-muted text-sm leading-relaxed max-w-xs">
              Empowering teams with AI-native vision intelligence. See further, decide faster.
            </p>
            {/* Newsletter */}
            <div className="flex gap-2 pt-4">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-av-surface border border-av-border rounded-full px-4 py-2 text-sm text-av-text placeholder:text-av-muted focus:outline-none focus:border-av-accent transition-colors"
              />
              <button className="bg-av-accent text-av-bg text-sm font-semibold px-5 py-2 rounded-full hover:bg-av-accent/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>

          {/* Columns */}
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-av-muted mb-5">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-av-muted hover:text-av-text transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-av-muted">
          <p>© {new Date().getFullYear()} Autivision, Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-av-text transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-av-text transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

## 7.7 `components/home/HeroSection.tsx`

**Purpose**: Full-viewport opening section with animated headline, subtext, dual CTA, and abstract visual.

```tsx
"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Play } from "lucide-react";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
});

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-av-bg bg-glow-green">
      {/* Grid texture */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none" />
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-av-accent/5 blur-[120px] pointer-events-none" />

      <div className="container-av relative z-10 pt-28 pb-20 grid md:grid-cols-2 gap-16 items-center">
        {/* Left: Text */}
        <div className="space-y-8">
          <motion.div {...fadeUp(0.1)}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-av-accent font-dm border border-av-accent/30 rounded-full px-4 py-1.5 bg-av-accent/5">
              <span className="w-1.5 h-1.5 rounded-full bg-av-accent animate-pulse" />
              Now in Public Beta
            </span>
          </motion.div>

          <motion.h1 {...fadeUp(0.2)} className="font-syne text-display-xl font-extrabold text-av-text leading-none">
            See What
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-av-accent to-av-accent2">
              Others Can't.
            </span>
          </motion.h1>

          <motion.p {...fadeUp(0.35)} className="text-av-muted text-lg md:text-xl leading-relaxed max-w-lg font-dm">
            Autivision is the AI vision intelligence platform that transforms raw data into decisive clarity — in real time.
          </motion.p>

          <motion.div {...fadeUp(0.5)} className="flex flex-wrap gap-4">
            <Button href="/contact" size="lg">
              Start for Free <ArrowRight size={18} />
            </Button>
            <Button variant="outline" size="lg">
              <Play size={16} className="fill-av-accent" /> Watch Demo
            </Button>
          </motion.div>

          <motion.p {...fadeUp(0.65)} className="text-av-muted text-sm font-dm">
            No credit card required · GDPR compliant · Enterprise SSO
          </motion.p>
        </div>

        {/* Right: Abstract Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex items-center justify-center"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <svg viewBox="0 0 500 500" className="w-full max-w-[480px] h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="250" cy="250" r="220" stroke="rgba(79,255,164,0.12)" strokeWidth="1" strokeDasharray="8 6" />
      <circle cx="250" cy="250" r="170" stroke="rgba(167,139,250,0.1)" strokeWidth="1" strokeDasharray="4 8" />
      {/* Center node */}
      <circle cx="250" cy="250" r="40" fill="rgba(79,255,164,0.08)" stroke="rgba(79,255,164,0.5)" strokeWidth="1.5" />
      <circle cx="250" cy="250" r="12" fill="rgba(79,255,164,0.9)" />
      {/* Satellite nodes */}
      {[0, 72, 144, 216, 288].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 250 + 170 * Math.cos(rad);
        const y = 250 + 170 * Math.sin(rad);
        return (
          <g key={i}>
            <line x1="250" y1="250" x2={x} y2={y} stroke="rgba(79,255,164,0.15)" strokeWidth="1" />
            <circle cx={x} cy={y} r="10" fill="rgba(167,139,250,0.15)" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
          </g>
        );
      })}
      {/* Data labels */}
      <text x="250" y="150" fill="rgba(240,240,245,0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">VISION_API</text>
      <text x="370" y="310" fill="rgba(240,240,245,0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">INFERENCE</text>
      <text x="130" y="310" fill="rgba(240,240,245,0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">STREAM</text>
    </svg>
  );
}
```

---

## 7.8 `components/home/MarqueeStrip.tsx`

**Purpose**: Horizontally scrolling partner/integration logos.

```tsx
const brands = [
  "Vercel", "Stripe", "Salesforce", "AWS", "Snowflake",
  "Databricks", "Notion", "Slack", "HubSpot", "Figma",
];

export function MarqueeStrip() {
  const doubled = [...brands, ...brands];
  return (
    <section className="py-10 border-y border-av-border overflow-hidden">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-av-muted mb-6 font-dm">
        Trusted by teams at
      </p>
      <div className="relative flex">
        <div className="flex gap-16 animate-marquee whitespace-nowrap">
          {doubled.map((brand, i) => (
            <span key={i} className="text-av-muted/50 font-syne font-bold text-xl uppercase tracking-wider hover:text-av-muted transition-colors cursor-default select-none">
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7.9 `components/home/FeatureSection.tsx`

**Purpose**: Alternating feature panels (image left/right + text).

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { features } from "@/lib/data/features";
import { CheckCircle2 } from "lucide-react";

export function FeatureSection() {
  return (
    <section id="features" className="section-pad bg-av-bg">
      <div className="container-av">
        <RevealOnScroll className="text-center mb-20 space-y-4">
          <SectionLabel label="Core Capabilities" />
          <h2 className="font-syne text-display-lg font-extrabold text-av-text">
            Intelligence at every layer.
          </h2>
          <p className="text-av-muted text-lg max-w-xl mx-auto font-dm">
            From raw ingestion to actionable insight — Autivision handles the full vision pipeline so your team doesn't have to.
          </p>
        </RevealOnScroll>

        <div className="space-y-32">
          {features.map((feat, i) => (
            <RevealOnScroll key={feat.title} delay={0.1}>
              <div className={`grid md:grid-cols-2 gap-16 items-center ${i % 2 !== 0 ? "md:flex-row-reverse" : ""}`}>
                {/* Visual panel */}
                <div className={i % 2 !== 0 ? "md:order-2" : ""}>
                  <div className="bg-av-surface border border-av-border rounded-2xl aspect-video flex items-center justify-center overflow-hidden">
                    <div className="w-16 h-16 rounded-xl bg-av-accent/10 border border-av-accent/30 flex items-center justify-center text-av-accent text-3xl">
                      {feat.icon}
                    </div>
                  </div>
                </div>
                {/* Text */}
                <div className={`space-y-6 ${i % 2 !== 0 ? "md:order-1" : ""}`}>
                  <span className="inline-block text-av-accent font-syne text-5xl">{feat.icon}</span>
                  <h3 className="font-syne text-display-md font-bold text-av-text">{feat.title}</h3>
                  <p className="text-av-muted text-base leading-relaxed font-dm">{feat.description}</p>
                  <ul className="space-y-3">
                    {feat.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-av-muted font-dm">
                        <CheckCircle2 size={16} className="mt-0.5 text-av-accent flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7.10 `components/home/StatsBar.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const stats = [
  { value: 99.9,  suffix: "%",  label: "Uptime SLA"            },
  { value: 3,     suffix: "ms", label: "Median inference time" },
  { value: 500,   suffix: "+",  label: "Enterprise customers"  },
  { value: 10,    suffix: "B+", label: "Images processed"      },
];

export function StatsBar() {
  return (
    <section className="py-20 bg-av-surface border-y border-av-border">
      <div className="container-av">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {stats.map((s, i) => (
            <RevealOnScroll key={s.label} delay={i * 0.1}>
              <div>
                <p className="font-syne text-5xl font-extrabold text-av-accent">
                  <AnimatedCounter to={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm text-av-muted font-dm">{s.label}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7.11 `components/home/MissionSection.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function MissionSection() {
  return (
    <section className="section-pad bg-av-bg overflow-hidden">
      <div className="container-av grid md:grid-cols-12 gap-12 items-start">
        <RevealOnScroll className="md:col-span-5 space-y-5">
          <SectionLabel label="Our Mission" />
          <h2 className="font-syne text-display-lg font-extrabold text-av-text">
            Vision is the last frontier of AI.
          </h2>
        </RevealOnScroll>
        <RevealOnScroll delay={0.2} className="md:col-span-7 space-y-6">
          <blockquote className="border-l-2 border-av-accent pl-6 font-syne text-display-md font-bold text-av-accent/80 leading-tight">
            "We built Autivision because the gap between what AI can see and what humans can act on was costing the world billions."
          </blockquote>
          <p className="text-av-muted text-base leading-relaxed font-dm">
            Our founders spent years at the intersection of computer vision research and enterprise infrastructure. We saw companies spending 18 months integrating off-the-shelf vision APIs that still required armies of ML engineers to make production-ready. Autivision collapses that to days.
          </p>
          <p className="text-av-muted text-base leading-relaxed font-dm">
            We believe every organization — from 10-person startups to Fortune 500s — deserves access to the same visual intelligence that was once reserved for tech giants with hundred-million-dollar research budgets.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
```

---

## 7.12 `components/home/TestimonialsSection.tsx`

```tsx
"use client";
import { useRef } from "react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { testimonials } from "@/lib/data/testimonials";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir === "right" ? 380 : -380, behavior: "smooth" });
  };

  return (
    <section className="section-pad bg-av-bg">
      <div className="container-av">
        <RevealOnScroll className="flex items-end justify-between mb-12">
          <div className="space-y-3">
            <SectionLabel label="What Teams Say" />
            <h2 className="font-syne text-display-lg font-extrabold text-av-text">Real results,<br />real teams.</h2>
          </div>
          <div className="hidden md:flex gap-3">
            <button onClick={() => scroll("left")}  className="w-10 h-10 rounded-full border border-av-border flex items-center justify-center text-av-muted hover:text-av-text hover:border-av-accent transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll("right")} className="w-10 h-10 rounded-full border border-av-border flex items-center justify-center text-av-muted hover:text-av-text hover:border-av-accent transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </RevealOnScroll>

        <div ref={ref} className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 hide-scrollbar">
          {testimonials.map((t, i) => (
            <div key={i} className="snap-start flex-shrink-0 w-[360px] bg-av-surface border border-av-border rounded-2xl p-8 space-y-5">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="text-av-accent text-sm">★</span>
                ))}
              </div>
              <p className="text-av-text text-base leading-relaxed font-dm">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-9 h-9 rounded-full bg-av-accent/20 border border-av-accent/30 flex items-center justify-center font-syne font-bold text-av-accent text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-av-text font-dm">{t.name}</p>
                  <p className="text-xs text-av-muted font-dm">{t.role}, {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7.13 `components/home/CTABand.tsx`

```tsx
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { ArrowRight } from "lucide-react";

export function CTABand() {
  return (
    <section className="py-32 bg-av-surface border-y border-av-border relative overflow-hidden">
      <div className="absolute inset-0 bg-glow-green pointer-events-none" />
      <div className="container-av relative z-10 text-center space-y-8">
        <RevealOnScroll>
          <h2 className="font-syne text-display-lg font-extrabold text-av-text max-w-3xl mx-auto">
            Ready to see everything?
          </h2>
        </RevealOnScroll>
        <RevealOnScroll delay={0.15}>
          <p className="text-av-muted text-lg max-w-xl mx-auto font-dm">
            Join hundreds of teams that have transformed their decision-making with Autivision. Setup takes under 10 minutes.
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/contact" size="lg">
              Get Early Access <ArrowRight size={18} />
            </Button>
            <Button href="/about" variant="outline" size="lg">
              Learn Our Story
            </Button>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
```

---

## 7.14 `components/about/TimelineSection.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { timeline } from "@/lib/data/timeline";

export function TimelineSection() {
  return (
    <section className="section-pad bg-av-bg">
      <div className="container-av max-w-3xl mx-auto">
        <RevealOnScroll className="text-center mb-16 space-y-4">
          <SectionLabel label="Our Journey" />
          <h2 className="font-syne text-display-lg font-extrabold text-av-text">From research to revolution.</h2>
        </RevealOnScroll>
        <div className="relative space-y-12">
          {/* vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-av-border" />
          {timeline.map((item, i) => (
            <RevealOnScroll key={i} delay={i * 0.1}>
              <div className="flex gap-8 relative">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-av-accent/10 border-2 border-av-accent flex items-center justify-center z-10 mt-1">
                  <span className="w-2 h-2 rounded-full bg-av-accent" />
                </div>
                <div className="space-y-1 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-av-accent font-dm">{item.year}</p>
                  <h3 className="font-syne font-bold text-xl text-av-text">{item.title}</h3>
                  <p className="text-av-muted text-sm leading-relaxed font-dm">{item.description}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7.15 `components/team/TeamGrid.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { team } from "@/lib/data/team";
import { Linkedin, Twitter } from "lucide-react";

export function TeamGrid() {
  return (
    <section className="section-pad bg-av-bg">
      <div className="container-av">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <RevealOnScroll key={member.name} delay={i * 0.07}>
              <div className="group relative bg-av-surface border border-av-border rounded-2xl p-6 overflow-hidden hover:border-av-accent/50 transition-all duration-300">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-av-accent/20 to-av-accent2/20 border border-av-border flex items-center justify-center font-syne font-bold text-2xl text-av-text mb-4">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </div>
                <h3 className="font-syne font-bold text-av-text text-lg">{member.name}</h3>
                <p className="text-av-accent text-sm font-dm mb-2">{member.role}</p>
                <p className="text-av-muted text-xs font-dm leading-relaxed">{member.bio}</p>
                {/* Hover links */}
                <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {member.linkedin && (
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-av-border flex items-center justify-center text-av-muted hover:text-av-accent transition-colors">
                      <Linkedin size={13} />
                    </a>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7.16 `components/contact/ContactForm.tsx`

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Wire to your backend / Resend / Formspree here
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-6xl">✓</div>
        <h3 className="font-syne font-bold text-2xl text-av-text">Message received.</h3>
        <p className="text-av-muted font-dm">We'll be in touch within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {[
        { name: "name",    label: "Full Name",          type: "text",  placeholder: "Jane Doe"             },
        { name: "email",   label: "Work Email",         type: "email", placeholder: "jane@company.com"     },
        { name: "company", label: "Company",            type: "text",  placeholder: "Acme Corp"            },
      ].map((f) => (
        <div key={f.name}>
          <label className="block text-xs font-semibold uppercase tracking-widest text-av-muted mb-2 font-dm">{f.label}</label>
          <input
            type={f.type}
            name={f.name}
            required
            placeholder={f.placeholder}
            className="w-full bg-av-surface border border-av-border rounded-xl px-4 py-3 text-av-text placeholder:text-av-muted focus:outline-none focus:border-av-accent transition-colors font-dm text-sm"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-av-muted mb-2 font-dm">Message</label>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell us about your use case..."
          className="w-full bg-av-surface border border-av-border rounded-xl px-4 py-3 text-av-text placeholder:text-av-muted focus:outline-none focus:border-av-accent transition-colors font-dm text-sm resize-none"
        />
      </div>
      <Button type="submit" size="lg" className="w-full justify-center">Send Message</Button>
    </form>
  );
}
```

---

# 8. Page Implementations

---

## 8.1 `app/page.tsx` — Home

```tsx
import { HeroSection }          from "@/components/home/HeroSection";
import { MarqueeStrip }         from "@/components/home/MarqueeStrip";
import { FeatureSection }       from "@/components/home/FeatureSection";
import { StatsBar }             from "@/components/home/StatsBar";
import { MissionSection }       from "@/components/home/MissionSection";
import { TestimonialsSection }  from "@/components/home/TestimonialsSection";
import { CTABand }              from "@/components/home/CTABand";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MarqueeStrip />
      <FeatureSection />
      <StatsBar />
      <MissionSection />
      <TestimonialsSection />
      <CTABand />
    </>
  );
}
```

---

## 8.2 `app/about/page.tsx`

```tsx
import { SectionLabel }     from "@/components/ui/SectionLabel";
import { RevealOnScroll }   from "@/components/ui/RevealOnScroll";
import { ValuesGrid }       from "@/components/about/ValuesGrid";
import { TimelineSection }  from "@/components/about/TimelineSection";
import { CTABand }          from "@/components/home/CTABand";

export const metadata = {
  title: "About — Autivision",
  description: "The story and mission behind Autivision.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-28 bg-av-bg bg-glow-green">
        <div className="container-av max-w-4xl">
          <RevealOnScroll>
            <SectionLabel label="About Autivision" />
          </RevealOnScroll>
          <RevealOnScroll delay={0.1}>
            <h1 className="font-syne text-display-xl font-extrabold text-av-text mt-5 mb-8">
              We built the eyes<br />your AI was missing.
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={0.2}>
            <p className="text-av-muted text-xl leading-relaxed max-w-2xl font-dm">
              Autivision started as a research project in a San Francisco garage. Three years and 500 enterprise deployments later, we're redefining what it means for machines to see — and for teams to act.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <ValuesGrid />
      <TimelineSection />
      <CTABand />
    </>
  );
}
```

---

## 8.3 `app/team/page.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel }   from "@/components/ui/SectionLabel";
import { TeamGrid }       from "@/components/team/TeamGrid";
import { CTABand }        from "@/components/home/CTABand";

export const metadata = {
  title: "Team — Autivision",
  description: "Meet the people building Autivision.",
};

export default function TeamPage() {
  return (
    <>
      <section className="pt-40 pb-20 bg-av-bg">
        <div className="container-av text-center space-y-5">
          <RevealOnScroll>
            <SectionLabel label="The Team" />
          </RevealOnScroll>
          <RevealOnScroll delay={0.1}>
            <h1 className="font-syne text-display-xl font-extrabold text-av-text">
              Builders. Researchers.<br />Visionaries.
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={0.2}>
            <p className="text-av-muted text-lg max-w-xl mx-auto font-dm">
              Our team blends deep ML research with enterprise product experience. We've shipped vision systems used by millions.
            </p>
          </RevealOnScroll>
        </div>
      </section>
      <TeamGrid />
      <CTABand />
    </>
  );
}
```

---

## 8.4 `app/contact/page.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel }   from "@/components/ui/SectionLabel";
import { ContactForm }    from "@/components/contact/ContactForm";
import { Mail, MapPin, Clock } from "lucide-react";

export const metadata = {
  title: "Contact — Autivision",
  description: "Get in touch with the Autivision team.",
};

export default function ContactPage() {
  return (
    <section className="pt-40 pb-32 bg-av-bg">
      <div className="container-av grid md:grid-cols-2 gap-20 items-start">
        {/* Left */}
        <RevealOnScroll className="space-y-8">
          <SectionLabel label="Get in Touch" />
          <h1 className="font-syne text-display-lg font-extrabold text-av-text">
            Let's build together.
          </h1>
          <p className="text-av-muted text-base leading-relaxed font-dm">
            Whether you're evaluating Autivision for your enterprise, a researcher exploring our API, or a startup ready to integrate — we're here to help.
          </p>
          <div className="space-y-5 pt-2">
            {[
              { icon: Mail,    text: "hello@autivision.ai"   },
              { icon: MapPin,  text: "San Francisco, CA · Remote-first" },
              { icon: Clock,   text: "Replies within 1 business day"    },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-av-surface border border-av-border flex items-center justify-center text-av-accent">
                  <Icon size={16} />
                </div>
                <span className="text-sm text-av-muted font-dm">{text}</span>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Right: Form */}
        <RevealOnScroll delay={0.2} className="bg-av-surface border border-av-border rounded-2xl p-10">
          <ContactForm />
        </RevealOnScroll>
      </div>
    </section>
  );
}
```

---

## 8.5 `components/about/ValuesGrid.tsx`

```tsx
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionLabel }   from "@/components/ui/SectionLabel";

const values = [
  {
    icon: "◎",
    title: "Clarity over complexity",
    description: "We believe the best AI doesn't make things harder to understand — it strips away noise until truth is obvious.",
  },
  {
    icon: "⟳",
    title: "Speed as a value",
    description: "Speed isn't a feature, it's a philosophy. Every millisecond of latency is a decision delayed.",
  },
  {
    icon: "⬡",
    title: "Open by design",
    description: "We build on open standards, publish our research, and believe in a future where AI vision is a public good.",
  },
  {
    icon: "◈",
    title: "Human in the loop",
    description: "AI should amplify human judgment, never replace it. Our platform keeps your team in control.",
  },
];

export function ValuesGrid() {
  return (
    <section className="section-pad bg-av-surface border-y border-av-border">
      <div className="container-av">
        <RevealOnScroll className="text-center mb-16 space-y-3">
          <SectionLabel label="Our Values" />
          <h2 className="font-syne text-display-lg font-extrabold text-av-text">What we stand for.</h2>
        </RevealOnScroll>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {values.map((v, i) => (
            <RevealOnScroll key={v.title} delay={i * 0.1}>
              <div className="space-y-4 p-6 bg-av-bg rounded-2xl border border-av-border hover:border-av-accent/40 transition-colors">
                <span className="text-3xl text-av-accent">{v.icon}</span>
                <h3 className="font-syne font-bold text-av-text text-lg">{v.title}</h3>
                <p className="text-av-muted text-sm leading-relaxed font-dm">{v.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

# 9. Content (Autivision)

## Hero
- **Headline**: "See What Others Can't."
- **Sub**: "Autivision is the AI vision intelligence platform that transforms raw data into decisive clarity — in real time."
- **CTA Primary**: "Start for Free"
- **CTA Secondary**: "Watch Demo"
- **Badge**: "Now in Public Beta"

## Features (`lib/data/features.ts`)

```ts
export const features = [
  {
    icon: "⚡",
    title: "Real-Time Vision Inference",
    description:
      "Process millions of images and video frames per second with sub-3ms latency, using our globally distributed inference mesh.",
    bullets: [
      "Edge deployment with zero cold-start",
      "WebSocket streaming API for live video",
      "Automatic model versioning and rollback",
    ],
  },
  {
    icon: "🧠",
    title: "Adaptive Model Intelligence",
    description:
      "Autivision's models continuously improve from your domain data — no retraining pipelines, no MLOps overhead.",
    bullets: [
      "Few-shot domain adaptation in hours",
      "Active learning surfaces the highest-value labels",
      "Drift detection and automated retraining triggers",
    ],
  },
  {
    icon: "🔗",
    title: "Enterprise Integration Layer",
    description:
      "Connect Autivision to your existing data stack in minutes with our native connectors, SDKs, and Terraform provider.",
    bullets: [
      "Native connectors for Snowflake, Databricks, BigQuery",
      "REST, GraphQL, and gRPC APIs",
      "SOC2 Type II certified, HIPAA & GDPR ready",
    ],
  },
];
```

## Stats
- 99.9% Uptime SLA
- 3ms Median inference time
- 500+ Enterprise customers
- 10B+ Images processed

## Testimonials (`lib/data/testimonials.ts`)

```ts
export const testimonials = [
  {
    quote: "We cut our visual QA cycle from 6 hours to 4 minutes. Autivision is the most impactful infrastructure decision we've made this year.",
    name: "Sarah Chen",
    role: "VP Engineering",
    company: "ManuFlex AI",
  },
  {
    quote: "The API is genuinely a joy to work with. Docs are excellent, latency is outstanding, and the team responds to support tickets in minutes.",
    name: "James Okafor",
    role: "Principal Architect",
    company: "Helios Data",
  },
  {
    quote: "Autivision's adaptive models understood our medical imaging domain within a single afternoon. What used to take months of ML work now takes an afternoon.",
    name: "Dr. Leila Moradi",
    role: "Head of AI",
    company: "ClearPath Health",
  },
  {
    quote: "We evaluated six vision platforms. Autivision was the only one that actually delivered on the real-time promise — at production scale.",
    name: "Tom Warrick",
    role: "CTO",
    company: "Strato Commerce",
  },
];
```

## Timeline (`lib/data/timeline.ts`)

```ts
export const timeline = [
  { year: "2021", title: "Research begins", description: "Three ex-Google Brain and DeepMind researchers start exploring the gap between research-grade vision models and production deployments." },
  { year: "2022", title: "Seed round & first prototype", description: "$4.2M seed from Sequoia. First internal inference engine achieves sub-10ms latency on commodity hardware." },
  { year: "2023", title: "Private beta launch", description: "50 design partners validate the core product. Net Promoter Score of 74 in first cohort." },
  { year: "2024", title: "Series A & platform launch", description: "$28M Series A led by Andreessen Horowitz. Autivision launches publicly with 200 enterprise customers on day one." },
  { year: "2025", title: "Global expansion", description: "Edge nodes deployed in 18 regions. 500+ customers across healthcare, manufacturing, retail, and logistics." },
];
```

## Team (`lib/data/team.ts`)

```ts
export const team = [
  { name: "Priya Nair",       role: "CEO & Co-Founder",       bio: "Former Google Brain research lead. Published 40+ vision papers. Obsessed with the last mile of AI deployment.",  linkedin: "#" },
  { name: "Marcus Webb",      role: "CTO & Co-Founder",       bio: "Ex-DeepMind infrastructure lead. Built distributed ML systems serving 2B users.",                               linkedin: "#" },
  { name: "Sofia Reyes",      role: "CPO",                    bio: "Previously led product at Scale AI and Roboflow. Turns research into experiences teams love.",                  linkedin: "#" },
  { name: "Kwame Asante",     role: "VP Engineering",         bio: "Distributed systems veteran from Cloudflare. Responsible for Autivision's globally consistent inference mesh.", linkedin: "#" },
  { name: "Hana Sato",        role: "Head of ML Research",    bio: "PhD MIT Computer Vision. Developed the adaptive domain specialization algorithms at the core of Autivision.",   linkedin: "#" },
  { name: "Luca Ferrari",     role: "Head of Design",         bio: "Designed interfaces at Stripe and Linear. Believes great AI products should be invisible.",                     linkedin: "#" },
  { name: "Anika Johansson",  role: "VP Sales",               bio: "Closed >$60M in enterprise SaaS deals. Helps customers realize ROI within the first sprint.",                  linkedin: "#" },
  { name: "Devon Park",       role: "Head of DevRel",         bio: "Former OSS maintainer with 12k GitHub stars. Builds the community and documentation that makes developers love Autivision.", linkedin: "#" },
];
```

---

# 10. Animations

## Animation Inventory

| Location | Animation | Implementation |
|---|---|---|
| All sections | Fade-up on scroll | `RevealOnScroll` component (Framer Motion `useInView`) |
| Hero headline | Staggered word/line reveal | Framer Motion `variants` with `staggerChildren` |
| Stats | Count-up numbers | `AnimatedCounter` component (Framer Motion `useSpring`) |
| Marquee logos | Continuous horizontal scroll | CSS `animation: marquee 30s linear infinite` |
| Navbar | Transparency → frosted glass | CSS `transition` on scroll event |
| Feature cards | Border highlight on hover | Tailwind `hover:border-av-accent/50 transition-all` |
| Team cards | Opacity reveal on hover | Tailwind `group-hover:opacity-100 transition-opacity` |
| CTA glow | Ambient green glow pulse | Tailwind `animate-glow` keyframe |
| Hero visual SVG | Fade-in + scale-up | Framer Motion initial/animate on mount |

## Hero Staggered Text Animation (optional upgrade)

```tsx
// In HeroSection.tsx — replace static h1 with:
const words = ["See", "What", "Others", "Can't."];
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const word = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

<motion.h1
  variants={container}
  initial="hidden"
  animate="visible"
  className="font-syne text-display-xl font-extrabold text-av-text leading-none"
>
  {words.map((w, i) => (
    <motion.span key={i} variants={word} className={i === 3 ? "text-transparent bg-clip-text bg-gradient-to-r from-av-accent to-av-accent2" : ""}>
      {w}{" "}
    </motion.span>
  ))}
</motion.h1>
```

## Hide Scrollbar Utility (globals.css)

```css
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

# 11. Assembly Instructions

## Step 1: Create Project

```bash
npx create-next-app@latest autivision \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir no \
  --import-alias "@/*"
cd autivision
```

## Step 2: Install Dependencies

```bash
npm install framer-motion lucide-react
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

## Step 3: Configure Tailwind

Replace `tailwind.config.ts` with the full config from Section 6.

## Step 4: Configure globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .container-av {
    @apply max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16;
  }
  .section-pad {
    @apply py-24 md:py-32 lg:py-40;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
}
```

## Step 5: Add `lib/utils.ts`

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Step 6: Create All Data Files

Create files in `lib/data/`:
- `features.ts` → content from Section 9
- `testimonials.ts` → content from Section 9
- `timeline.ts` → content from Section 9
- `team.ts` → content from Section 9

## Step 7: Create All Components

Create each component file from Section 7 in the folder structure from Section 3.

## Step 8: Create All Pages

Create pages from Section 8.

## Step 9: Add Root Layout

Replace `app/layout.tsx` with the code from Section 5.

## Step 10: Run the Project

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Step 11: Verify Routes

| URL | Expected Page |
|---|---|
| `localhost:3000/`       | Home — all sections visible |
| `localhost:3000/about`  | About — hero, values, timeline |
| `localhost:3000/team`   | Team grid |
| `localhost:3000/contact`| Contact form |

---

# Checklist for Claude Code

- [ ] `tailwind.config.ts` has all custom colors, fonts, animations, and backgroundImage tokens
- [ ] `app/globals.css` has `@tailwind` directives + utility classes
- [ ] `lib/utils.ts` exports `cn()`
- [ ] All 4 data files exist in `lib/data/`
- [ ] `RevealOnScroll` and `AnimatedCounter` use `"use client"` directive
- [ ] `Navbar` and `ContactForm` use `"use client"` directive
- [ ] `HeroSection` uses `"use client"` directive (Framer Motion)
- [ ] `TestimonialsSection` uses `"use client"` directive
- [ ] All imports use `@/` alias
- [ ] `next.config.ts` has no blocking rules for Google Fonts
- [ ] `Button` component handles both `href` (Link) and `onClick` (button) modes
- [ ] Marquee has doubled array (`[...brands, ...brands]`) for seamless loop
