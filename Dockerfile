FROM node:22-slim

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
RUN mkdir -p /data

ENV PORT=8080
ENV DB_PATH=/data/fantasy2026.db
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "src/app.js"]
