FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project source
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Run Vite dev server with --host to allow external access
CMD ["npm", "run", "dev", "--", "--host"]
