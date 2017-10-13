FROM node:latest

WORKDIR /usr/src/k9bot

# Install dependencies
COPY package.json .
COPY yarn.lock .
RUN yarn

# Copy source
COPY . .

# Run
CMD [ "env", "DEBUG=*", "node", "index.js" ]
