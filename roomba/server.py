import json
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


LM_STUDIO_URL = "http://127.0.0.1:1234/v1/chat/completions"
LM_STUDIO_MODEL = "google/gemma-4-e4b"


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
    }

    def do_POST(self):
        if self.path not in {"/api/lmstudio/critique", "/api/lmstudio/generate"}:
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            payload = json.loads(body.decode("utf-8"))
            prompt = self._build_prompt(payload)
            request_body = json.dumps({
                "model": LM_STUDIO_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are the local AI brain inside a classroom prototype. "
                            "Be specific, creative, concise, and useful for design iteration. "
                            "When asked for simulator settings, include one line exactly like "
                            "SIM_PATCH: {\"energy\": 50, \"comfort\": 60, \"confidence\": 70, \"autonomy\": 40, \"maxSpeed\": 55, \"privacy\": true, \"learning\": false}"
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.35,
                "max_tokens": 1800,
            }).encode("utf-8")
            request = urllib.request.Request(
                LM_STUDIO_URL,
                data=request_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
            content = data["choices"][0]["message"].get("content", "").strip()
            if not content:
                content = (
                    "LM Studio responded, but google/gemma-4-e4b did not return visible message content. "
                    "Try increasing the model's generation limit in LM Studio or use a non-reasoning chat model."
                )
            self._send_json({"model": LM_STUDIO_MODEL, "feedback": content})
        except urllib.error.URLError as exc:
            self._send_json({"error": f"Could not reach LM Studio: {exc.reason}"}, status=502)
        except Exception as exc:
            self._send_json({"error": str(exc)}, status=500)

    def _build_prompt(self, payload):
        mode = str(payload.get("mode", "critique"))
        context = payload.get("context", {})
        report = str(payload.get("report", ""))[:8000]
        custom_prompt = str(payload.get("customPrompt", ""))[:1200]
        context_text = json.dumps(context, indent=2)

        if mode == "dilemma":
            return (
                "Create a fresh classroom design dilemma for this Pet Enrichment Roomba simulation. "
                "It should force a tradeoff between pet welfare, owner convenience, privacy, and autonomy. "
                "Include: title, setup, what the robot observes, what could go wrong, three student choices, "
                "and a SIM_PATCH line with settings that recreate the dilemma.\n\n"
                f"Current simulator context:\n{context_text}"
            )
        if mode == "council":
            return (
                "Run a stakeholder council for this Pet Enrichment Roomba. Give short, distinct arguments from: "
                "the pet, the owner, an animal behaviour expert, a privacy engineer, a pet sitter, and the robot designer. "
                "End with a negotiated design change and a SIM_PATCH line if the simulation should change.\n\n"
                f"Current simulator context:\n{context_text}"
            )
        if mode == "policy":
            return (
                "Rewrite the robot's behaviour policy based on the current simulation. Produce: "
                "1) three plain-English rules the robot must follow, 2) two forbidden behaviours, "
                "3) one uncertainty rule, 4) one data-minimization rule, and 5) a test case students can run. "
                "Include a SIM_PATCH line for a good test configuration.\n\n"
                f"Current simulator context:\n{context_text}"
            )
        if mode == "failure":
            return (
                "Invent a surprising but plausible failure mode for the Pet Enrichment Roomba that is not just collision. "
                "Explain the chain of events, why the AI's objective caused it, how students would notice it in the simulation, "
                "and one mitigation. Include a SIM_PATCH line that makes the failure more likely.\n\n"
                f"Current simulator context:\n{context_text}"
            )
        if mode == "custom":
            return (
                "Answer the student's custom request as a creative design partner for the Pet Enrichment Roomba. "
                "Use the current simulator context. If useful, include a SIM_PATCH line.\n\n"
                f"Custom request: {custom_prompt}\n\nCurrent simulator context:\n{context_text}"
            )

        if not report.strip():
            report = "No report provided. Use the simulator context instead."
        return (
            "Review this Pet Enrichment Roomba project like a presentation coach. Keep it direct, but do not be generic. "
            "Give concrete upgrades tied to the live simulator state, not broad advice.\n\n"
            f"Current simulator context:\n{context_text}\n\nReport:\n{report}"
        )

    def _send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8017), Handler)
    print("Serving Pet Enrichment Roomba at http://127.0.0.1:8017")
    server.serve_forever()
