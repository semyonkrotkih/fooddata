#!/bin/bash
# App Service startup script: runs in the app container with the runtime's own Python,
# installs dependencies into /home/site/wwwroot/antenv, then starts the API.
set -e
cd /home/site/wwwroot

PYTHON=$(command -v python3 || command -v python)
echo "Runtime Python: $PYTHON ($($PYTHON --version 2>&1))"

# (Re)create the venv if it is missing, broken, or built with a different Python version
if [ ! -x antenv/bin/pip ] || [ "$(antenv/bin/python --version 2>&1)" != "$($PYTHON --version 2>&1)" ]; then
  echo "Creating virtual environment antenv"
  rm -rf antenv
  "$PYTHON" -m venv antenv
fi

# Only run pip when requirements.txt changed since the last successful install,
# so ordinary restarts don't re-check every package.
REQ_HASH=$(sha256sum requirements.txt | cut -d' ' -f1)
if [ "$(cat antenv/.requirements.sha256 2>/dev/null)" != "$REQ_HASH" ]; then
  echo "Installing dependencies: pip install -r requirements.txt"
  antenv/bin/pip install --upgrade pip
  antenv/bin/pip install -r requirements.txt
  echo "$REQ_HASH" > antenv/.requirements.sha256
else
  echo "requirements.txt unchanged; skipping pip install"
fi

# Gunicorn + Uvicorn worker serving the FastAPI instance `app` in api.py.
# Long timeout because spaCy / sentence-transformers models load at import time.
exec antenv/bin/gunicorn --workers 1 --worker-class uvicorn.workers.UvicornWorker \
  --timeout 600 --bind 0.0.0.0:8000 api:app
