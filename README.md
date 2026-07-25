# Mozamandu (Moja Mandu) - Premium E-Commerce & Media Platform

![Mozamandu Banner](https://images.mozamandu.com/hero/hero-background.webp)

> **Mozamandu (Moja Mandu / मोझामान्डु)** is Nepal's premier online store for high-quality socks (moja / मोजा), boxers, undergarments, and daily essential wear. Engineered with a lightning-fast React frontend, Express Node.js Cloudflare R2 Media Backend, Supabase PostgreSQL database, and automated Answer Engine Optimization (AEO).

---

## 📖 Table of Contents
- [Architecture Overview](#-architecture-overview)
- [Key Technical Features](#-key-technical-features)
- [SEO & AEO (Answer Engine Optimization)](#-seo--aeo-answer-engine-optimization)
- [Cloudflare R2 Media Engine](#-cloudflare-r2-media-engine)
- [Environment Configuration](#-environment-configuration)
- [Local Development Setup](#-local-development-setup)
- [Docker & Containerized Production Deployment](#-docker--containerized-production-deployment)
- [Database Schema & Maintenance](#-database-schema--maintenance)

---

## 🏗️ Architecture Overview

Mozamandu utilizes a modern hybrid architecture built for speed, resilience, and maximum SEO performance:

```
                  ┌──────────────────────────────────────────────┐
                  │                 USER BROWSER                 │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
        ┌───────────────────────┐                 ┌───────────────────────┐
        │     Vite Dev /        │                 │ Express Node.js Server│
        │     Nginx Container   │                 │      (Port 3001)      │
        │     (Port 8080/8085)  │                 └───────────┬───────────┘
        └───────────┬───────────┘                             │
                    │                                         │
                    ▼                                         ▼
        ┌───────────────────────┐                 ┌───────────────────────┐
        │  Supabase PostgreSQL  │                 │  Cloudflare R2 Bucket │
        │      Database         │                 │   (images.mozamandu)  │
        └───────────────────────┘                 └───────────────────────┘
```

1. **Frontend**: React 18, TypeScript, TailwindCSS, Vite 5, Lucide Icons, Shadcn UI.
2. **Backend Media Engine**: Express Node.js server (`server/index.js`) running on port `3001`.
3. **Database**: Supabase PostgreSQL database holding products, categories, subcategories, media metadata (`media_library`), and blog articles (`blogs`).
4. **Object Storage & CDN**: Cloudflare R2 bucket (`mozamandu`) serving optimized WebP images over `https://images.mozamandu.com`.
5. **Reverse Proxying**: Vite and Nginx proxy all `/api/` and `/upload-r2` requests seamlessly to the Express backend.

---

## ✨ Key Technical Features

### 1. Dual-Mode Media Library & R2 Bucket Sync
- **Cloudflare R2 Object Key Sync (`/api/media/sync`)**: Auto-scans all objects inside the Cloudflare R2 bucket `mozamandu` and registers missing items into Supabase `media_library` with automatic folder classification.
- **R2 Object Key Relocation & Renaming (`/api/media/:id/rename`)**: Allows admins to rename keys or move files between R2 folders (`products`, `categories`, `logos`, `blog-images`, etc.). Linked references across `products`, `categories`, `subcategories`, `payment_methods`, and `site_settings` are updated in a single transaction.
- **Client-Side WebP Optimization**: Images uploaded via admin forms are automatically compressed to WebP in the browser before being stored in Cloudflare R2.

### 2. High-Intent SEO & AEO (Answer Engine Optimization)
- **AI Search Ready (`llms.txt`, `llms-full.txt`, `llm.txt`)**: Standardized LLM index files providing AI models (ChatGPT, Perplexity, Claude, Gemini) with accurate brand context, product categories, delivery options, and search query answers (`mozamandu`, `mojamandu`, `moja buy in nepal`).
- **AI Crawler Directives (`robots.txt`)**: Custom directives permitting `GPTBot`, `PerplexityBot`, `ClaudeBot`, `ChatGPT-User`, `Google-Extended`, and `Bytespider`.
- **Structured Data (JSON-LD)**: Rich `Organization`, `Store`, `WebSite`, `BreadcrumbList`, and `FAQPage` schemas embedded in `<head>`.
- **Image Attributes**: All frontend `<img>` elements feature `loading="lazy"`, `decoding="async"`, `alt`, and `title` tags for maximum lighthouse & search ranking performance.

---

## 🛠️ Environment Configuration

Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

### Environment Variables Template (`.env.example`)
```ini
# Supabase Credentials (Public / Anon Client)
VITE_SUPABASE_URL="https://huwhbxjlyucamitwwhyg.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key-here"
VITE_SUPABASE_PROJECT_ID="huwhbxjlyucamitwwhyg"

# Express R2 Backend Server Port
PORT=3001

# Cloudflare R2 Bucket S3 API Credentials (Keep Secret)
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
R2_BUCKET="mozamandu"
R2_PUBLIC_DOMAIN="https://images.mozamandu.com"

# Supabase Service Role Key (Keep Secret)
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key-here"
```

---

## 🚀 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Development Server
Running `npm run dev` concurrently starts the Express R2 Media server (`server/index.js` on port 3001) and Vite Dev server on port 8080:
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## 🐳 Docker & Containerized Production Deployment

The project includes a multi-stage Docker build with Nginx reverse proxying.

### 1. Build and Run Container Services
```bash
docker compose up -d --build
```

### 2. Clean Rebuild (No Cache & Prune)
```bash
docker system prune -af
docker compose build --no-cache && docker compose up -d
```

### 3. Ports & Proxy Mapping
- **Container Port**: `8085` (maps to internal Nginx port 80).
- **Host Gateway Access**: Uses `extra_hosts: ["host.docker.internal:host-gateway"]` to route `/api/` requests to the Express server running on port `3001`.

---

## 🧹 Maintenance & R2 Sync Scripts

### Manual R2 Bucket Database Sync
To re-synchronize Cloudflare R2 bucket objects with Supabase manually:
```bash
node scripts/sync_r2.mjs
```

---

## 📜 License & Copyright
© 2026 **Mozamandu**. All Rights Reserved. Designed & Engineered for Nepal.
