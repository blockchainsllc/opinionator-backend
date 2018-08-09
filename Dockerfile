FROM node:10-alpine
EXPOSE 9999
WORKDIR /app
COPY ./build /app/build
COPY ./data /app/data
COPY ./node_modules /app/node_modules
CMD [ "node", "./build/main.js" ]