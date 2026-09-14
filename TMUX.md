# Tmux Setup for Dataset Collector

This project uses a single tmux session to run the FastAPI server and the Vite client together.

## Start

```bash
cd /home/me/disk-256/00_RND_MODELS/paddlepaddle/dataset-collector
./start-tmux.sh
```

It creates a tmux session named `dataset-collector` with two windows:

| Window | Name | Command | Port |
|---|---|---|---|
| `0` | `server` | `uvicorn main:app --reload --host 0.0.0.0 --port 8888` | `8888` |
| `1` | `client` | `pnpm dev --host` | `5173` or next free |

The session is detached by default so it keeps running after you close the terminal.

## View live output

Attach to the session:

```bash
tmux attach -t dataset-collector
```

Switch to the server window:

```text
Ctrl+B then 0
```

Switch to the client window:

```text
Ctrl+B then 1
```

Scroll up to see earlier logs:

```text
Ctrl+B then [
```

Use arrow keys to scroll, `q` to exit scroll mode.

## Capture logs without attaching

Server logs:

```bash
tmux capture-pane -pt dataset-collector:server
```

Client logs:

```bash
tmux capture-pane -pt dataset-collector:client
```

Save server log to a file:

```bash
tmux capture-pane -p -t dataset-collector:server -S - > server.log
```

Save client log to a file:

```bash
tmux capture-pane -p -t dataset-collector:client -S - > client.log
```

`-S -` means capture from the beginning of the scrollback history.

## Save logs to files by default

If you prefer persistent log files, edit `start-tmux.sh` and run the commands through `tee`:

```bash
# server
... 2>&1 | tee logs/server.log

# client
... 2>&1 | tee logs/client.log
```

Create the log directory first:

```bash
mkdir -p logs
```

Then `tail -f logs/server.log` or `tail -f logs/client.log` from any terminal.

## Stop

```bash
tmux kill-session -t dataset-collector
```

This stops both the server and the client.
