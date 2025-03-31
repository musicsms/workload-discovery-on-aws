FROM node:18-alpine

WORKDIR /app

# Install AWS CLI for credential handling and troubleshooting
RUN apk add --no-cache \
    python3 \
    py3-pip \
    groff \
    curl \
    && pip3 install --upgrade pip \
    && pip3 install --no-cache-dir awscli

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV AWS_SDK_LOAD_CONFIG=1

CMD ["npm", "start"] 