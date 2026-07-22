# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build environment variables
ARG VITE_SUPABASE_URL=https://huwhbxjlyucamitwwhyg.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.cB3YipySfkizYpvwUPd9xlBlq_haPznmEpPgcbAwovQ
ARG VITE_SUPABASE_PROJECT_ID=huwhbxjlyucamitwwhyg

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Build static assets
RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
