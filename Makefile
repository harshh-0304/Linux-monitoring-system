.PHONY: help install install-dev test lint run docker-up docker-down clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install:  ## Install runtime dependencies
	pip install -r requirements.txt

install-dev:  ## Install dev + test dependencies
	pip install -r requirements-dev.txt

test:  ## Run the test suite
	pytest -q

run:  ## Run the monitoring agent locally
	python -m app.main

docker-up:  ## Start the stack with docker compose
	docker compose up -d --build

docker-down:  ## Stop the stack
	docker compose down

clean:  ## Remove caches and local metrics db
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -f metrics.db
