FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY ws-server.js ./

EXPOSE 3001

CMD ["node", "ws-server.js"]
