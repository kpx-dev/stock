.PHONY: setup refresh dev build deploy clean

PY := .venv/bin/python
PIP := .venv/bin/pip
TICKERS ?= AMZN MSFT AAPL GOOGL NVDA META

setup:
	python3 -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	cd web && npm install

refresh:
	$(PY) scripts/fetch.py $(TICKERS)
	$(PY) scripts/export.py

dev:
	cd web && npm run dev

build:
	cd web && npm run build

deploy: build
	@echo "Pushed to master triggers GitHub Pages deploy via Actions."

clean:
	rm -rf web/node_modules web/dist
