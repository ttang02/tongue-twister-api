FROM node:latest

ENV NODE_ENV production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install --production --silent && mv node_modules ../

COPY . /usr/src/app
EXPOSE 3000
CMD ["node","server.js"]