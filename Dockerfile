FROM iojs:2.3.0

ENV PATH ./node_modules/.bin/:$PATH
EXPOSE 5003

WORKDIR /usr/app
RUN npm install -g node-inspector

ENTRYPOINT ["/usr/app/bin/entrypoint.sh"]
CMD ["npm", "start"]
