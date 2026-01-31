FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# If your Hono app listens on 3000 (example)
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]