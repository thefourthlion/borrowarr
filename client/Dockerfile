# Use the official Node.js LTS image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies needed for build)
# Use --legacy-peer-deps to handle NextUI peer dependency conflicts
RUN npm install --legacy-peer-deps

# Copy the .env file first (for build time)
COPY .env ./

# Copy the rest of your application files
COPY . .

# Build the Next.js app for production
RUN npm run build

# Expose the port your app runs on
EXPOSE 3012

# Set the PORT environment variable
ENV PORT=3012
ENV NODE_ENV=production

# Start the Next.js production server
CMD ["npm", "run", "start"]