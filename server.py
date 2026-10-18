"""Heura demo server. Serves index.html and proxies /api/chat to a local model.

Assumes your model is exposed through an OpenAI-compatible endpoint
(Ollama, llama.cpp server, LM Studio, vLLM). Change the env vars below to match.

Run:  python server.py        then open http://localhost:8000
"""
import json, os, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen

MODEL_URL = os.environ.get("MODEL_URL", "http://localhost:11434/v1/chat/completions")
MODEL_NAME = os.environ.get("MODEL_NAME", "heura-arche")
PORT = int(os.environ.get("PORT", "8000"))
RATE_LIMIT = 10  # requests per minute per IP
MAX_CHARS = 1000

SYSTEM = ("You are Heura Arche, an AI engineer running locally for Brightloaf Bakery, "
          "a fictional 12-person bakery with a Shopify store, Google Sheets inventory and a POS CSV export. "
          "Help with scripts, report automation and small website fixes. Keep answers short and include code when useful.")

hits = {}
HERE = os.path.dirname(os.path.abspath(__file__))


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
        else:
            self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.path != "/api/chat":
            return self._send(404, json.dumps({"error": "not found"}))
        ip = self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()
        now = time.time()
        hits[ip] = [t for t in hits.get(ip, []) if now - t < 60] + [now]
        if len(hits[ip]) > RATE_LIMIT:
            return self._send(429, json.dumps({"error": "slow down"}))
        try:
            n = int(self.headers.get("Content-Length", 0))
            msg = json.loads(self.rfile.read(n))["message"][:MAX_CHARS]
            payload = {"model": MODEL_NAME, "stream": False, "messages": [
                {"role": "system", "content": SYSTEM}, {"role": "user", "content": msg}]}
            req = Request(MODEL_URL, json.dumps(payload).encode(), {"Content-Type": "application/json"})
            with urlopen(req, timeout=60) as r:
                reply = json.load(r)["choices"][0]["message"]["content"]
            self._send(200, json.dumps({"reply": reply}))
        except Exception:
            self._send(502, json.dumps({"error": "model unavailable"}))


if __name__ == "__main__":
    print(f"Heura demo on http://localhost:{PORT}  ->  {MODEL_URL} ({MODEL_NAME})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
