FROM node:iron-alpine

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install --production && yarn cache clean

COPY dist dist

COPY bin bin

COPY lib lib

EXPOSE 8425 8453/udp 8443

ENTRYPOINT [ "./bin/cli.js" ]
