FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY plugin ./plugin
RUN npm run build
USER node
EXPOSE 4242
CMD ["npm", "start"]
