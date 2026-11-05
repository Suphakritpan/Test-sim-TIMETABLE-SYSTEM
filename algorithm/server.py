import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"status": "ok"})
            return
        self._send(404, {"code": "E-API-404", "message": "ไม่พบ endpoint"})

    def do_POST(self):
        if self.path == "/api/schedule":
            self._send(
                501,
                {
                    "code": "E-ALG-001",
                    "message": "ยังไม่ได้เชื่อมต่อ algorithm จริง จึงไม่สามารถสร้างตารางเรียนได้",
                },
            )
            return
        self._send(404, {"code": "E-API-404", "message": "ไม่พบ endpoint"})

    def _send(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
