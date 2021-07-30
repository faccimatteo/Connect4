#
# $ docker build -t connect4 .
# $ docker network create c4
# $ docker run -it --network c4 --name connect4_server -p 8080:8080 connect4
#  
# For the mongodb shell:
# $ docker run -it --name mongodbshell --network c4 mongo:bionic mongo --host mymongo_c4
#
# For mongodb container:
# $ docker run --network c4 --name mymongo_c4 -d mongo:bionic
#
FROM node:12.14.1-buster-slim

EXPOSE 8080

WORKDIR /app
COPY . /app
RUN npm install
RUN npm run compile

CMD node connect4_server