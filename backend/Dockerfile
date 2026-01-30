FROM node:20-slim

WORKDIR /app

# Install PostgreSQL client for pg_isready and Puppeteer/Chrome dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    python3 \
    make \
    g++ \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libnspr4 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Copy startup script
COPY scripts/start.sh /usr/local/bin/start.sh
RUN sed -i 's/\r$//' /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose port
EXPOSE 3001

# Start application with startup script
CMD ["/usr/local/bin/start.sh"]
