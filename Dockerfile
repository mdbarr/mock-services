FROM node:erbium-alpine

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install --production

COPY . .

EXPOSE 8425 8453 8480

ENTRYPOINT [ "./bin/cli.js" ]
