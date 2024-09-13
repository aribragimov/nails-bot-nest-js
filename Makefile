NODE_ENV ?= development
PROJECT_NAME := nails-bot
RUN := run --rm

ifeq ($(USE_NFSMOUNT), true)
	DOCKER_COMPOSE_FILES := -f docker-compose.yml -f docker-compose.nfsmount.yml
else
	DOCKER_COMPOSE_FILES := -f docker-compose.yml
endif

ifneq ("$(wildcard ./docker-compose.override.yml)","")
	DOCKER_COMPOSE_FILES := $(DOCKER_COMPOSE_FILES) -f docker-compose.override.yml
endif

DOCKER_COMPOSE := docker-compose $(DOCKER_COMPOSE_FILES) --project-name $(PROJECT_NAME)
DOCKER_COMPOSE_RUN := $(DOCKER_COMPOSE) $(RUN)

BRANCH := $(shell git rev-parse --abbrev-ref HEAD)

provision: rebuild-docker install build migrate dump-schema

install:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app yarn install

build:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app nest build

app:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" --service-ports app npm run start:dev

test-unit:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=test" app yarn test

test-e2e:
ifeq ($(file),)
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=test" app yarn test:e2e
else
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=test" app yarn test:e2e -- ${file}
endif

lint:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=test" app yarn lint

lint-fix:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=test" app yarn lint-fix

sh:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app /bin/sh

down:
	${DOCKER_COMPOSE} down

down-v:
	${DOCKER_COMPOSE} down -v

build-docker:
	${DOCKER_COMPOSE} build

rebuild-docker:
	${DOCKER_COMPOSE} down app --rmi 'local'
	${DOCKER_COMPOSE} build --force-rm

logs:
	${DOCKER_COMPOSE} logs

psql:
	${DOCKER_COMPOSE_RUN} app psql -h db -U postgres bot_${NODE_ENV}

migrate:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=development" app yarn migration:up
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=test" app yarn migration:up

dump-schema:
	${DOCKER_COMPOSE_RUN} app pg_dump -h db -U postgres bot_${NODE_ENV} -s -x -O -f db/schema.sql

migration-generate:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app yarn migration:generate ./db/migrations/$(name)

migration-create:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app yarn migration:create ./db/migrations/$(name)

migration-up:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app yarn migration:up

migration-down:
	${DOCKER_COMPOSE_RUN} -e "NODE_ENV=${NODE_ENV}" app yarn migration:down
