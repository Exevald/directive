FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY directive-ai/plugin ./directive-ai/plugin
COPY directive-ai/server ./directive-ai/server
RUN npm run build
USER node
EXPOSE 4242
CMD ["node", "--experimental-strip-types", "directive-ai/server/src/http.ts"]
