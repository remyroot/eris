FROM node:22-slim

RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist/ ./dist/
COPY config/ ./config/

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

CMD ["node", "dist/src/index.js"]
