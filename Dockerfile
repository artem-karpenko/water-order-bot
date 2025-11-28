# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (for health checks if running HTTP server)
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Run the bot in polling mode (default)
# For webhook mode, override CMD with: node dist/index.js
CMD ["node", "dist/bot-standalone.js"]
