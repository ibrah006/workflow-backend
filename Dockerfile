FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# 1️⃣ Install dependencies
COPY package*.json ./
RUN npm install

# 2️⃣ Copy source
COPY . .

# 3️⃣ Build app
RUN npm run build

# 4️⃣ Runtime config
ENV PORT=3001
EXPOSE 3001

# 5️⃣ Run migrations THEN start server
CMD ["sh", "-c", "npm run migration:run && npm run start"]