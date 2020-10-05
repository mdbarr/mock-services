FROM node:erbium-alpine

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install --production

COPY . .

EXPOSE 5775 5780

CMD [ "./bin/cli.js" ]
