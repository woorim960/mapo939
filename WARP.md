# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Next.js 16.1.1 attendance tracking application built with React 19, TypeScript, and Tailwind CSS v4. The project uses the Next.js App Router architecture.

## Development Commands

### Development Server
```bash
npm run dev
```
Starts the development server at http://localhost:3000 with hot-reload enabled.

### Build & Production
```bash
npm run build    # Create production build
npm start        # Run production server
```

### Linting
```bash
npm run lint     # Run ESLint with Next.js configuration
```

The project uses ESLint 9 with `eslint-config-next` for both core web vitals and TypeScript rules.

## Architecture

### App Router Structure
This project uses Next.js App Router (not Pages Router):
- `app/layout.tsx` - Root layout with Geist font family configuration (sans and mono variants)
- `app/page.tsx` - Home page component
- `app/globals.css` - Global styles with Tailwind CSS directives

### TypeScript Configuration
- **Path alias**: `@/*` maps to the project root for cleaner imports
- **Strict mode**: Enabled for type safety
- **Target**: ES2017 with ESNext module resolution
- **JSX**: Uses react-jsx transform (new JSX runtime)

### Styling
The project uses Tailwind CSS v4 with:
- PostCSS configuration via `postcss.config.mjs`
- Custom CSS variables for Geist fonts
- Dark mode support via `dark:` class variants

### Static Assets
Public assets are served from the `public/` directory and accessible at the root URL (e.g., `/next.svg`).

## Code Patterns

### Component Structure
- Server Components by default (App Router behavior)
- Client Components require explicit `"use client"` directive
- Use `Image` from `next/image` for optimized images
- Font optimization via `next/font/google`

### Metadata
Export `metadata` object from `layout.tsx` or `page.tsx` for SEO configuration.

## Build Output
- `.next/` - Build output directory (ignored by git)
- `out/` - Static export output (ignored by git)
- Environment files (`.env*`) are git-ignored by default
