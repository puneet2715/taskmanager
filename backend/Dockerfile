#backend dockerfile - taskmanager
FROM node:22-bookworm-slim

WORKDIR /app

# Install Infisical CLI and required tools with proper apt cleanup
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        bash \
        curl \
        ca-certificates \
        gnupg; \
    curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash; \
    apt-get update; \
    apt-get install -y --no-install-recommends infisical; \
    apt-get purge -y --auto-remove gnupg; \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm i --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build

ENV NODE_ENV=production

# Run the application
CMD ["infisical", "run", "--projectId", "bf067cc9-af36-4ea5-9cca-38ff896d71ef", "--", "npm", "run", "start"]