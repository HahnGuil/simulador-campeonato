FROM node:20-alpine
WORKDIR /app
COPY server/package.json /app/server/package.json
RUN cd /app/server && npm install --omit=dev
COPY web/package.json /app/web/package.json
RUN cd /app/web && npm install
COPY server/src /app/server/src
COPY web /app/web
EXPOSE 5173 3001
CMD ["sh", "-c", "cd /app/server && npm start & cd /app/web && npm run dev -- --host 0.0.0.0"]
