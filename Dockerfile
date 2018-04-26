
# docker file for server

FROM node:carbon

# Create app directory
WORKDIR usr/src/app


ENV APP_NAME Persian-Mode
ENV APP_ADDRESS http://173.249.11.153
ENV PORT 3000
ENV DATABASE PersianMode
ENV DB_URI mongodb://localhost:27017/PersianMode
ENV REDIS_HOST redis
ENV GOOGLE_OAUTH_CLIENTID 636231560622ENVk29avsd6knviv7bu7ni9sf6r6okac3bt.apps.googleusercontent.com
ENV GOOGLE_OAUTH_CLIENTSECRET A7cwgIu3p8H37m69VqrjrW2J
ENV GOOGLE_OAUTH_CALLBACKURL http://173.249.11.153/api/login/google/callback
ENV ONLINE_WAREHOUSE_API http://localhost:81/order/inventory
ENV INVOICE_API http://localhost:81/order/invoice

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --only=production
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

RUN node configure.js

EXPOSE 80

CMD [ "npm", "start" ]
