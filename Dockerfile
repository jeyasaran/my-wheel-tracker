# Single-stage lightweight image — frontend is pre-built and committed to the repo
FROM node:20-slim
WORKDIR /app

# Install build dependencies for sqlite3 native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy backend source
COPY server/ ./server/

# Copy pre-built frontend (no build step needed on device)
COPY dist/ ./dist/

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/wheel_tracker.db

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server/index.js"]
