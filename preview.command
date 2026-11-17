#!/bin/zsh
set -eu
cd -- "$(dirname -- "$0")"

python3 - <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

handler = partial(SimpleHTTPRequestHandler, directory=str(Path.cwd()))
with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
    url = f"http://127.0.0.1:{server.server_port}/#film"
    print(f"Duo preview: {url}", flush=True)
    print("Keep this window open. Press Control-C to stop the preview.", flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPreview stopped.")
PY
