#!/usr/bin/env bash
set -e

ROOT="/home/me/disk-256/00_RND_MODELS/paddlepaddle/dataset-collector"
SESSION="dataset-collector"

# Stop any existing session
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Server window
tmux new-session -d -s "$SESSION" -n "server" \
  "source /home/me/miniconda3/etc/profile.d/conda.sh && conda activate closure && cd '$ROOT/server' && uvicorn main:app --reload --host 0.0.0.0 --port 8888"

# Client window
tmux new-window -t "$SESSION" -n "client" \
  "export NVM_DIR='$HOME/.nvm' && [ -s '$NVM_DIR/nvm.sh' ] && \. '$NVM_DIR/nvm.sh' && nvm use 22 && cd '$ROOT/client' && pnpm dev --host"

# Attach to the client window
tmux attach -t "$SESSION:client"
