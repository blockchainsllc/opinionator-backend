FROM node:alpine

WORKDIR /app
EXPOSE 9999
COPY ./build /app
RUN cd /app && npm install
CMD [ "npm", "start" ]