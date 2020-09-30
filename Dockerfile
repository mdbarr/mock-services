FROM node:erbium

WORKDIR /mock-services

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

EXPOSE 5775 5780

CMD [ "./bin/cli.js" ]
