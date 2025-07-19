# Use the official Node.js 18 Alpine image for smaller size and better security
FROM node:18-alpine AS base

# Install dependencies needed for Prisma and native modules
RUN apk add --no-cache libc6-compat openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM node:18-alpine AS builder

# Install dependencies needed for building
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY api ./api/

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Generate Prisma client (this creates api/generated/client)
RUN npm run p-gen

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Install dependencies needed for runtime
RUN apk add --no-cache libc6-compat openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy built application and dependencies from previous stages
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/api/generated ./dist/generated
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose the port that Cloud Run expects
EXPOSE 8080

# Set environment variable for Cloud Run
ENV PORT=8080
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]