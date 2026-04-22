# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY .npmrc package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi

# Copy application code
COPY . .

# Build application
RUN npm run build

# S46: Cannot prune dev deps — `tsx` is needed at runtime by `npm run start`
# The prestart script installs tsx but it's more reliable to keep it from build
# TODO: Move tsx to production deps or compile to JS for a smaller image


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app


# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
# S46: Direct start — no more deploy wrapper (S44 deployment complete)
# npm run start already includes --max-old-space-size=256
# S52: Use wrapper that can optionally compile + deploy Contract #14
COPY scripts/start-with-deploy.sh /app/scripts/start-with-deploy.sh
RUN chmod +x /app/scripts/start-with-deploy.sh
CMD [ "/app/scripts/start-with-deploy.sh" ]
