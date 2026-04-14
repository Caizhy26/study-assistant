FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server/index.mjs .

# CloudBase Run 默认监听端口是 80；如果本地跑容器想换端口，
# 通过 `docker run -e PORT=8787 -p 8787:8787` 覆盖即可，不在镜像里写死。
EXPOSE 80

CMD ["node", "index.mjs"]
