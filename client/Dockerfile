# Base image
FROM node:18-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app (static export)
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Runner stage (use a lightweight static file server)
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy static export output
COPY --from=builder /app/out ./

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
