# Stage 1: Build TypeScript code
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create a non-root user
RUN groupadd -r fastify && useradd -r -g fastify fastify
RUN chown -R fastify:fastify /app
USER fastify

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
