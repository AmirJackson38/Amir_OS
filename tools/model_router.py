import urllib.request
import json
import os

OMNIROUTE_BASE_URL = os.environ.get("OMNIROUTE_BASE_URL", "http://localhost:20128/v1")

class OmniRouteClient:
    def __init__(self, base_url=OMNIROUTE_BASE_URL, default_model="auto/best-coding"):
        self.base_url = base_url.rstrip('/')
        self.default_model = default_model

    def list_models(self):
        url = f"{self.base_url}/models"
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                return [m.get('id') for m in data.get('data', [])]
        except Exception as e:
            return [f"Error listing models: {e}"]

    def completion(self, prompt, model=None, system_prompt=None, temperature=0.3):
        url = f"{self.base_url}/chat/completions"
        target_model = model or self.default_model
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature
        }

        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

        try:
            with urllib.request.urlopen(req) as response:
                res_json = json.loads(response.read().decode('utf-8'))
                return {
                    "success": True,
                    "model_used": res_json.get("model", target_model),
                    "content": res_json['choices'][0]['message']['content']
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

if __name__ == "__main__":
    client = OmniRouteClient()
    print("OmniRoute Client initialized.")
    print("Available route targets:", client.list_models()[:5])
