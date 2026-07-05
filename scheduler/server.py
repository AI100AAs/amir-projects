from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import urllib.error
import urllib.request


LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
LM_STUDIO_MODEL = "google/gemma-4-e4b"


class SchedulerHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/lmstudio":
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            prompt = payload.get("prompt", "")
            if not prompt:
                self._send_json({"error": "Missing prompt"}, status=400)
                return

            body = {
                "model": LM_STUDIO_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a cautious UBC course-planning reviewer for a prototype. "
                            "Be concise, state uncertainty, and never present the schedule as "
                            "official advising or an official UBC degree audit. Provide only "
                            "the final answer in 5 short bullets or fewer."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 1600,
                "stream": False,
                "reasoning_effort": "none",
                "reasoning": {"enabled": False},
            }

            request = urllib.request.Request(
                LM_STUDIO_URL,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read()
                self.send_response(response.status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.URLError as error:
            self._send_json(
                {"error": f"LM Studio connection failed: {error.reason}"},
                status=502,
            )
        except Exception as error:
            self._send_json({"error": str(error)}, status=500)

    def _send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 4173), SchedulerHandler)
    print("Serving Course Scheduler at http://127.0.0.1:4173")
    server.serve_forever()
