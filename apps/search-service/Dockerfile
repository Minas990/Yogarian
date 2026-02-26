FROM node:24-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

RUN npm install

COPY apps/search-service apps/search-service
COPY libs libs

EXPOSE 8009

CMD ["npm", "run", "start:dev", "search-service"]