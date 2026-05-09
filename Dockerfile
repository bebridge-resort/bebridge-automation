FROM mcr.microsoft.com/playwright/node:20-jammy

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
