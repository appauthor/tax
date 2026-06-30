#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
import json

HOST = "127.0.0.1"
PORT = 8787
ALLOWED_HOST = "api.vworld.kr"


class VWorldProxyHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self, status=200, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", content_type)
        self.end_headers()

    def send_json_error(self, status, message):
        self.send_cors_headers(status)
        payload = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_cors_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path != "/vworld-proxy":
            self.send_json_error(404, "Not found")
            return

        target_url = parse_qs(parsed.query).get("url", [""])[0]

        if not target_url:
            self.send_json_error(400, "Missing url parameter")
            return

        parsed_target = urlparse(target_url)

        if parsed_target.scheme != "https" or parsed_target.netloc != ALLOWED_HOST:
            self.send_json_error(400, "Only VWorld API URLs are allowed")
            return

        try:
            request = Request(
                target_url,
                headers={"User-Agent": "tax-calculator-local-vworld-proxy/1.0"}
            )

            with urlopen(request, timeout=15) as response:
                response_body = response.read()

            self.send_cors_headers(200)
            self.wfile.write(response_body)
        except Exception as err:
            self.send_json_error(502, str(err))


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), VWorldProxyHandler)
    print(f"VWorld local proxy running at http://{HOST}:{PORT}/vworld-proxy")
    print("Keep this terminal open while testing with Live Server.")
    server.serve_forever()
