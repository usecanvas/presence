FROM iojs:2.3.0-onbuild

ENV PATH ./node_modules/.bin/:$PATH

EXPOSE 80

CMD npm start
