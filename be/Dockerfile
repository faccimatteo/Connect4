FROM node:12.14.1-buster-slim

EXPOSE 8080

WORKDIR /app
COPY . /app
RUN npm install
RUN npm run compile

CMD node connect4_server
