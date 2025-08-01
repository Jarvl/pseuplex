# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./


# Install all dependencies (including dev dependencies) for building
RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# `node` is a default user provided by the node image
RUN chown node:node ./
USER node

# Copy built application from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Start the app
ENTRYPOINT [ "node", "dist/main.js", "--config=/config/config.json" ]
