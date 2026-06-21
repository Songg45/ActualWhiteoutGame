FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS development

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]

FROM dependencies AS build

COPY . .
RUN pnpm build

FROM nginx:1.29-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

