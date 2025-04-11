FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (uncomment if you need to build)
# RUN npm run build

# Set environment variables if needed
# ENV NODE_ENV=production

# Expose the port the app runs on

CMD ["sleep", "infinity"]