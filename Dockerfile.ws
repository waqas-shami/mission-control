FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

COPY ws-server.js ./

EXPOSE 3001

CMD ["node", "ws-server.js"]
