.PHONY: help setup dev test

help:
	@echo "Available commands:"
	@echo "  make setup   - Install dependencies for client and server"
	@echo "  make dev     - Run client and server in development mode"
	@echo "  make test    - Run tests for client and server"

setup:
	@echo "Setting up Server..."
	cd server && pip install -r requirements.txt
	@echo "Setting up Client..."
	cd client && npm install

dev:
	@echo "Starting Development Servers..."
	@# Run both servers in parallel. Trap SIGINT to kill both on Ctrl+C.
	@(trap 'kill 0' SIGINT; \
	  (cd server && uvicorn app.main:app --reload --port 8000) & \
	  (cd client && npm run dev) & \
	  wait)

test:
	@echo "Running Server Tests..."
	cd server && pytest
	@echo "Running Client Tests..."
	cd client && npm test
