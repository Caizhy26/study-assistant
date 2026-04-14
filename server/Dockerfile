FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server/index.mjs .

EXPOSE 8787

ENV PORT=8787

CMD ["node", "index.mjs"]