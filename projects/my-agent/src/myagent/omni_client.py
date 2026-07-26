import json
import httpx
from .config import get_omniroute_config


class OmniRouteError(Exception):
    pass


class OmniRouteClient:
    def __init__(self, config=None):
        cfg = config or get_omniroute_config()
        self.base_url = cfg["base_url"]
        self.api_key = cfg["api_key"]
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    def _url(self, path):
        return f"{self.base_url}/{path.lstrip('/')}"

    def check_connection(self):
        try:
            r = httpx.get(self._url("models"), headers=self.headers, timeout=5.0)
            return r.status_code == 200, r.status_code
        except httpx.ConnectError:
            return False, "Connection refused"
        except httpx.TimeoutException:
            return False, "Timeout"
        except Exception as e:
            return False, str(e)

    def list_models(self):
        r = httpx.get(self._url("models"), headers=self.headers, timeout=10.0)
        if r.status_code != 200:
            raise OmniRouteError(f"Failed to list models: HTTP {r.status_code}")
        data = r.json()
        models = []
        for m in data.get("data", []):
            mid = m.get("id")
            if mid:
                models.append(mid)
        return models

    def chat_completion(self, messages, model="auto/best-chat", temperature=0.3, stream=True, tools=None, tool_choice="auto"):
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice
        if stream:
            yield from self._do_stream(payload)
        else:
            yield self._do_non_stream(payload)

    def _do_stream(self, payload):
        client = httpx.Client(timeout=httpx.Timeout(120.0, connect=10.0))
        try:
            with client.stream("POST", self._url("chat/completions"), json=payload, headers=self.headers) as r:
                if r.status_code != 200:
                    try:
                        err_body = r.json()
                        err_msg = err_body.get("error", {}).get("message", "")
                    except Exception:
                        err_msg = ""
                    raise OmniRouteError(f"OmniRoute error (HTTP {r.status_code}): {err_msg}")
                headers_dict = dict(r.headers)
                yield from self._stream_response(r, headers_dict)
        finally:
            client.close()

    def _do_non_stream(self, payload):
        client = httpx.Client(timeout=httpx.Timeout(120.0, connect=10.0))
        try:
            r = client.post(self._url("chat/completions"), json=payload, headers=self.headers)
            if r.status_code != 200:
                try:
                    err_body = r.json()
                    err_msg = err_body.get("error", {}).get("message", str(r.text))
                except Exception:
                    err_msg = str(r.text)
                raise OmniRouteError(f"OmniRoute error (HTTP {r.status_code}): {err_msg}")
            headers_dict = dict(r.headers)
            return self._parse_response(r, headers_dict)
        finally:
            client.close()

    def _stream_response(self, response, meta_headers):
        content = ""
        model_used = None
        done_sent = False
        tool_calls_acc = {}

        for line in response.iter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                delta = chunk.get("choices", [{}])[0].get("delta", {})
                delta_content = delta.get("content")
                if delta_content:
                    content += delta_content
                    yield {"type": "delta", "content": delta_content, "full": content}

                tc_delta = delta.get("tool_calls")
                if tc_delta:
                    for tc in tc_delta:
                        idx = tc.get("index", 0)
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                        if tc.get("id"):
                            tool_calls_acc[idx]["id"] = tc["id"]
                        if tc.get("type"):
                            tool_calls_acc[idx]["type"] = tc["type"]
                        fn = tc.get("function", {})
                        if fn.get("name"):
                            tool_calls_acc[idx]["function"]["name"] += fn["name"]
                        if fn.get("arguments"):
                            tool_calls_acc[idx]["function"]["arguments"] += fn["arguments"]

                if not model_used:
                    model_used = chunk.get("model")

                fr = chunk.get("choices", [{}])[0].get("finish_reason")
                if fr and not done_sent:
                    done_sent = True
                    usage = chunk.get("usage", {})
                    tool_calls_list = list(tool_calls_acc.values()) if tool_calls_acc else None
                    yield {
                        "type": "done",
                        "content": content,
                        "model": model_used or "unknown",
                        "finish_reason": fr,
                        "usage": usage,
                        "metadata": meta_headers,
                        "tool_calls": tool_calls_list
                    }

        if not done_sent:
            tool_calls_list = list(tool_calls_acc.values()) if tool_calls_acc else None
            yield {
                "type": "done",
                "content": content,
                "model": model_used or "unknown",
                "finish_reason": "stop",
                "usage": {},
                "metadata": meta_headers,
                "tool_calls": tool_calls_list
            }

    def _parse_response(self, response, meta_headers):
        data = response.json()
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        return {
            "type": "done",
            "content": message.get("content", ""),
            "model": data.get("model", "unknown"),
            "finish_reason": choice.get("finish_reason", "stop"),
            "usage": data.get("usage", {}),
            "metadata": meta_headers,
            "tool_calls": message.get("tool_calls")
        }
