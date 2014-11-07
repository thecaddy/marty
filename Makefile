BIN = ./node_modules/.bin

.PHONY: bootstrap start clean test;

SRC = $(shell find ./lib ./index.js ./test -type f -name '*.js')

test: lint
	@$(BIN)/karma start --single-run

test-watch: lint
	@$(BIN)/karma start

lint: bootstrap clean
	@$(BIN)/jsxcs $(SRC);
	@$(BIN)/jsxhint $(SRC);

release: lint
	@$(BIN)/browserify --require ./index.js --standalone Marty > dist/marty.js
	@cat dist/marty.js | $(BIN)/uglifyjs > dist/marty.min.js

clean:
	@rm -rf dist
	@mkdir dist

bootstrap: package.json
	@npm install;