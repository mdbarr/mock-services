FROM node as builder

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

FROM node:erbium-alpine

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install --production

COPY --from=builder /mock-services/dist dist

COPY . .

EXPOSE 8425 8453 8480

ENTRYPOINT [ "./bin/cli.js" ]
