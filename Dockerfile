FROM iojs:2.5.0

ENV PATH ./node_modules/.bin/:$PATH
EXPOSE 80

RUN npm install -g node-inspector

RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY package.json /usr/app/
RUN npm install

COPY . /usr/app/

CMD ["npm", "start"]
