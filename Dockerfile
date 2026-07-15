# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# bcrypt needs to compile its native binding
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++ \
  && addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads/branches && chown -R nestjs:nodejs uploads
USER nestjs

EXPOSE 3000
CMD ["node", "dist/src/main"]
