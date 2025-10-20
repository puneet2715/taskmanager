#frontend dockerfile - taskmanager
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm i --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Production image
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y bash curl && curl -1sLf \
'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
&& apt-get update && apt-get install -y infisical

ENV NODE_ENV=production

# Copy built application from builder stage
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Run the application
# CMD ["npm", "start"]
CMD ["infisical", "run", "--projectId", "bf067cc9-af36-4ea5-9cca-38ff896d71ef", "--", "npm", "run", "start"]