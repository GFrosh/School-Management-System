# Use a lightweight official Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of your Express source code
COPY . .

# Document the port your Express server listens on
EXPOSE 5000

# Start the Express server
CMD ["node", "./src/server.js"]
