FROM node:20-slim

WORKDIR /app

# Install build dependencies for sqlite3 if needed, though pre-built binaries often work
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy server source
COPY server/ .

# Expose backend port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
