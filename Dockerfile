# =========================
# 1. Base image
# =========================
FROM node:18-alpine AS base

# Enable corepack để dùng yarn
RUN corepack enable

WORKDIR /app


# =========================
# 2. Dependencies
# =========================
FROM base AS deps

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile


# =========================
# 3. Build
# =========================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build


# =========================
# 4. Production runner
# =========================
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Cài pm2 global
RUN npm install -g pm2

# Copy build output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.* ./
COPY ecosystem.config.js ./

# Expose port Next.js
EXPOSE 4356

# Start Next.js bằng pm2
# CMD ["pm2-runtime", "start", "node_modules/.bin/next", "--name", "nextjs-app", "--", "start", "-p", "4356"]
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
