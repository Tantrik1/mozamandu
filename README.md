# Mozamandu - Premium Socks E-Commerce

Mozamandu is a React & Vite based online store for premium socks and accessories in Nepal.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend & Database**: Supabase Cloud
- **Containerization**: Docker & Nginx
- **Web Server & SSL**: Nginx Reverse Proxy with Cloudflare

## Deployment with Docker

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

The application runs on port `8085` internally and is reverse proxied via Nginx for `mozamandu.com` and `www.mozamandu.com`.
