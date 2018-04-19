build:
	docker build -t k9bot .

run:
	docker run -d k9bot

dev:
	env ./node_modules/.bin/nodemon index.js
