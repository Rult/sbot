FROM node:12
WORKDIR /app
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    libtool \
    autoconf \
    automake \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev
COPY package*.json monkey-patch.sh ./
# --unsafe-perm required to run the postinstall script as the root user
RUN npm install --unsafe-perm
COPY . .
CMD ["npm", "start"]
