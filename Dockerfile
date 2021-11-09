# API server for IAHSP EU
#
# @author Gabriel Tumbaga <gabriel.tumbaga@stagedhomes.com>

# See README.md for build instructions and/or notes.
# use node
FROM node:12.18-alpine3.9

# set working directory
WORKDIR /

# bundle source code
# .dockerignore has been created to ignore certain stuff from being copied
COPY . .

# Install deps.
# RUN npm install --production
RUN npm install

