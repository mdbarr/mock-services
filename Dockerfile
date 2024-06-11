FROM node:iron as builder

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install

COPY *.js .* ./

COPY public public

COPY ./lib/defaults.js ./lib/defaults.js

COPY src src

RUN yarn build



FROM node:iron-alpine

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install --production && yarn cache clean

COPY --from=builder /mock-services/dist dist

COPY bin bin

COPY lib lib

EXPOSE 8425 8453/udp 8443

ENTRYPOINT [ "./bin/cli.js" ]
