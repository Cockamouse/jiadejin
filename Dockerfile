FROM node:8.4.0-alpine
WORKDIR /myapp
RUN npm i -g typescript
ADD package.json /myapp/package.json
RUN npm i
ADD tsconfig.json /myapp/tsconfig.json