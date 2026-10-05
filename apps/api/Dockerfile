FROM apps/api
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
RUN npm install --omit=dev=false
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/index.js"]
