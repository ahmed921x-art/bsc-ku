"""Serve BioLab Virtual Bench on your local network so an iPad can open it.

Usage:  python serve.py            (port 8080, all network interfaces)
        python serve.py 9000       (custom port)
        python serve.py 8765 127.0.0.1   (this computer only)
"""
import http.server
import os
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
HOST = sys.argv[2] if len(sys.argv) > 2 else "0.0.0.0"
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript",
                      ".webmanifest": "application/manifest+json"}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # Always serve fresh files; offline caching is handled by the service worker.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer((HOST, PORT), Handler) as httpd:
        print("BioLab Virtual Bench is running.")
        print(f"  On this computer:  http://localhost:{PORT}")
        if HOST == "0.0.0.0":
            print(f"  On your iPad (same Wi-Fi):  http://{lan_ip()}:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
