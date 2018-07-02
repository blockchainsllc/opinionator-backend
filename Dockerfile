FROM node:8-alpine

WORKDIR /app
EXPOSE 9999
COPY ./ /app

CMD [ "node", "./build/server.js" ]