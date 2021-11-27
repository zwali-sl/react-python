# pull official base image
FROM node:14.7.0-alpine

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY ./version-demo-app/package.json ./
COPY ./version-demo-app/package-lock.json ./
RUN npm install --silent
RUN npm install react-scripts@3.4.1 -g --silent

# add app
COPY ./version-demo-app/. ./

# start app
CMD ["npm", "start"]