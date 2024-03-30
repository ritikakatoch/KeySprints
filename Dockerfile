FROM node:18

WORKDIR /keysprints

ADD package.json package-lock.json /keysprints

RUN npm install

ADD src/ ./src
ADD public/ ./public


EXPOSE 3000

CMD [ "npm", "start" ]
