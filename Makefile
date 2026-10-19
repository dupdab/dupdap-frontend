.PHONY: dev build test lint analyze

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint
	npm run format:check

analyze:
	npm run analyze
