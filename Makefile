build:
	docker build -t k9bot .

run:
	docker run -d k9bot

dev:
	yarn start:dev
