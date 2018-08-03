FROM node:10-alpine AS build
WORKDIR /app
# install build tools
RUN apk add --no-cache python make gcc g++ git
RUN npm install -g typescript

COPY ./ /app
RUN cd /app && npm install && tsc

FROM node:10-alpine
EXPOSE 9999
WORKDIR /app
COPY --from=build /app /app
CMD [ "node", "./build/main.js" ]