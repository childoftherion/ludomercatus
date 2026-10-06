FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Expose port
EXPOSE 7070

# Run the server
CMD ["bun", "run", "./index.ts"]
