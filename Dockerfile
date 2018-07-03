FROM node:8-alpine AS build

WORKDIR /app
EXPOSE 9999

# install build tools
RUN apk add --no-cache python make gcc g++ git
RUN npm install -g typescript

COPY ./ /app
RUN cd /app && npm install && tsc

FROM node:8-alpine
COPY --from=build /app /app
CMD [ "node", "./build/server.js" ]