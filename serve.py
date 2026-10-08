#!/usr/bin/env python3
"""Static file server plus OTP email for AMFIT password reset."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import sys
import smtplib
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
MAIL_PATH = os.path.join(ROOT, "mail.json")
OTP_PATH = os.path.join(ROOT, "data", "otp.json")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
OTP_TTL = 600
RESEND_WAIT = 60
MAX_TRIES = 5
MAX_BODY = 4096
MAX_EDIT_BODY = 12 * 1024 * 1024
USDA_KEY = os.environ.get("AMFIT_USDA_KEY") or "DEMO_KEY"
_lock = threading.Lock()
_food_cache = {}

# FDC nutrientNumber → AMFIT field. Values are typically per 100 g.
USDA_NUTRIENTS = {
    "1008": ("kcal", "macros"), "208": ("kcal", "macros"),
    "1003": ("protein", "macros"), "203": ("protein", "macros"),
    "1005": ("carbs", "macros"), "205": ("carbs", "macros"),
    "1004": ("fat", "macros"), "204": ("fat", "macros"),
    "1079": ("fiber", "macros"), "291": ("fiber", "macros"),
    "2000": ("sugar", "macros"), "269": ("sugar", "macros"),
    "1106": ("vitA", "micros"), "320": ("vitA", "micros"),
    "1162": ("vitC", "micros"), "401": ("vitC", "micros"),
    "1114": ("vitD", "micros"), "328": ("vitD", "micros"),
    "1109": ("vitE", "micros"), "323": ("vitE", "micros"),
    "1185": ("vitK", "micros"), "430": ("vitK", "micros"),
    "1165": ("b1", "micros"), "404": ("b1", "micros"),
    "1166": ("b2", "micros"), "405": ("b2", "micros"),
    "1167": ("b3", "micros"), "406": ("b3", "micros"),
    "1175": ("b6", "micros"), "415": ("b6", "micros"),
    "1177": ("folate", "micros"), "417": ("folate", "micros"),
    "1178": ("b12", "micros"), "418": ("b12", "micros"),
    "1087": ("calcium", "micros"), "301": ("calcium", "micros"),
    "1089": ("iron", "micros"), "303": ("iron", "micros"),
    "1090": ("magnesium", "micros"), "304": ("magnesium", "micros"),
    "1092": ("potassium", "micros"), "306": ("potassium", "micros"),
    "1093": ("sodium", "micros"), "307": ("sodium", "micros"),
    "1095": ("zinc", "micros"), "309": ("zinc", "micros"),
    "1103": ("selenium", "micros"), "317": ("selenium", "micros"),
    "1091": ("phosphorus", "micros"), "305": ("phosphorus", "micros"),
    "1253": ("cholesterol", "micros"), "601": ("cholesterol", "micros"),
}


def map_fdc_food(raw: dict) -> dict:
    macros = {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0, "sugar": 0.0}
    micros = {
        "vitA": 0, "vitC": 0, "vitD": 0, "vitE": 0, "vitK": 0,
        "b1": 0, "b2": 0, "b3": 0, "b6": 0, "folate": 0, "b12": 0,
        "calcium": 0, "iron": 0, "magnesium": 0, "potassium": 0, "sodium": 0,
        "zinc": 0, "selenium": 0, "phosphorus": 0, "omega3": 0, "cholesterol": 0,
    }
    omega = 0.0
    name_map = {
        "energy": ("kcal", "macros"),
        "protein": ("protein", "macros"),
        "total lipid (fat)": ("fat", "macros"),
        "carbohydrate, by difference": ("carbs", "macros"),
        "fiber, total dietary": ("fiber", "macros"),
        "sugars, total including nlea": ("sugar", "macros"),
        "sugars, total": ("sugar", "macros"),
    }
    for item in raw.get("foodNutrients") or []:
        num = str(item.get("nutrientNumber") or "")
        try:
            val = float(item.get("value") or 0)
        except (TypeError, ValueError):
            continue
        spec = USDA_NUTRIENTS.get(num)
        if not spec:
            nname = str(item.get("nutrientName") or "").strip().lower()
            spec = name_map.get(nname)
        if spec:
            key, bucket = spec
            if bucket == "macros":
                macros[key] = val
            else:
                micros[key] = val
        if num in ("1278", "1272", "629", "621", "851"):
            omega += val
    micros["omega3"] = round(omega, 3)
    name = str(raw.get("description") or "USDA food").strip().title()
    serving = str(raw.get("householdServingFullText") or "").strip()
    if not serving:
        size = raw.get("servingSize")
        unit = raw.get("servingSizeUnit") or "g"
        serving = ("%s %s (USDA)" % (size, unit)) if size else "100 g (USDA FoodData Central)"
    else:
        serving = serving + " (USDA)"
    return {
        "name": name,
        "serving": serving,
        "source": "USDA FoodData Central",
        "fdcId": raw.get("fdcId"),
        "macros": macros,
        "micros": micros,
    }


def search_usda(query: str) -> list:
    q = re.sub(r"[^\w\s+\-]", "", query).strip()[:80]
    if len(q) < 2:
        return []
    key = q.lower()
    now = time.time()
    hit = _food_cache.get(key)
    if hit and now - hit[0] < 600:
        return hit[1]
    url = "https://api.nal.usda.gov/fdc/v1/foods/search?" + urllib.parse.urlencode({
        "query": q,
        "pageSize": "8",
        "api_key": USDA_KEY,
    })
    req = urllib.request.Request(url, headers={"User-Agent": "AMFIT/1.0"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    foods = [map_fdc_food(row) for row in (payload.get("foods") or [])]
    _food_cache[key] = (now, foods)
    return foods


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_json(path: str, default):
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return default


def save_json(path: str, data) -> None:
    folder = os.path.dirname(path)
    if folder:
        os.makedirs(folder, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(data, handle)
    os.replace(tmp, path)


def send_mail(cfg: dict, to_addr: str, otp: str) -> None:
    host = str(cfg["host"])
    port = int(cfg.get("port") or 587)
    user = str(cfg["user"])
    password = str(cfg["password"])
    from_addr = str(cfg.get("from") or user)
    msg = EmailMessage()
    msg["Subject"] = "Your AMFIT password reset code"
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(
        "Your AMFIT one-time code is " + otp + ".\n\n"
        "It expires in 10 minutes. If you did not ask to reset your password, ignore this email.\n"
    )
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(user, password)
        smtp.send_message(msg)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self) -> None:
        # Static files revalidate on every load, so an auth rule change can't hide behind a cached script.
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/foods":
            self._search_foods(parsed)
            return
        super().do_GET()

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/send-otp":
            self._send_otp()
            return
        if path == "/api/verify-otp":
            self._verify_otp()
            return
        if path == "/api/consume-reset":
            self._consume_reset()
            return
        if path == "/api/art":
            self._art()
            return
        if path == "/api/edit":
            self._edit()
            return
        self.send_error(404)

    def _search_foods(self, parsed) -> None:
        qs = urllib.parse.parse_qs(parsed.query)
        query = (qs.get("q") or [""])[0]
        try:
            foods = search_usda(query)
        except urllib.error.HTTPError as exc:
            self._write_json(502, {"ok": False, "error": "USDA returned HTTP %s." % exc.code, "foods": []})
            return
        except Exception:
            self._write_json(502, {"ok": False, "error": "Could not reach USDA FoodData Central.", "foods": []})
            return
        self._write_json(200, {"ok": True, "source": "USDA FoodData Central", "foods": foods})

    def _art(self) -> None:
        try:
            data = self._read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            self._write_json(400, {"ok": False, "error": "Invalid request."})
            return
        prompt = re.sub(r"\s+", " ", str(data.get("prompt") or "")).strip()[:500]
        if len(prompt) < 8:
            self._write_json(400, {"ok": False, "error": "Prompt is too short."})
            return
        seed = int(time.time() * 1000) % 1_000_000
        url = "https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt) + "?" + urllib.parse.urlencode({
            "width": "768",
            "height": "768",
            "nologo": "true",
            "seed": str(seed),
        })
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 AMFIT/1.0",
            "Accept": "image/jpeg,image/png,image/webp,*/*",
        })
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                raw = resp.read(6 * 1024 * 1024)
                ctype = (resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip()
        except Exception:
            self._write_json(502, {"ok": False, "error": "Free image host timed out. Try again."})
            return
        if len(raw) < 800 or not (raw.startswith(b"\xff\xd8") or raw.startswith(b"\x89PNG") or raw.startswith(b"RIFF")):
            self._write_json(502, {"ok": False, "error": "Free image host did not return a picture."})
            return
        if not ctype.startswith("image/"):
            ctype = "image/jpeg"
        try:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(raw)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # Browser navigated away while the slow image host was still working.
            pass

    def _edit(self) -> None:
        """Redraw the user's own photo with OpenAI image edits. The key is theirs and is never stored."""
        try:
            data = self._read_json(MAX_EDIT_BODY)
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            self._write_json(400, {"ok": False, "error": "Invalid request."})
            return
        key = str(data.get("key") or "").strip()
        prompt = re.sub(r"\s+", " ", str(data.get("prompt") or "")).strip()[:900]
        image_b64 = str(data.get("image") or "")
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        if not key.startswith("sk-"):
            self._write_json(400, {"ok": False, "error": "Paste your OpenAI key (starts with sk-)."})
            return
        if len(prompt) < 8:
            self._write_json(400, {"ok": False, "error": "Prompt is too short."})
            return
        try:
            photo = base64.b64decode(image_b64, validate=True)
        except Exception:
            self._write_json(400, {"ok": False, "error": "Could not read that photo."})
            return
        if len(photo) < 800:
            self._write_json(400, {"ok": False, "error": "Add a progress photo first."})
            return

        if photo.startswith(b"\x89PNG"):
            filename, mime = "photo.png", "image/png"
        elif photo.startswith(b"RIFF"):
            filename, mime = "photo.webp", "image/webp"
        else:
            filename, mime = "photo.jpg", "image/jpeg"

        boundary = "amfit" + secrets.token_hex(12)
        sep = ("--" + boundary + "\r\n").encode()
        parts = [
            sep + b'Content-Disposition: form-data; name="model"\r\n\r\ngpt-image-1\r\n',
            sep + b'Content-Disposition: form-data; name="size"\r\n\r\n1024x1024\r\n',
            sep + b'Content-Disposition: form-data; name="n"\r\n\r\n1\r\n',
            sep + b'Content-Disposition: form-data; name="prompt"\r\n\r\n' + prompt.encode("utf-8") + b"\r\n",
            sep + ('Content-Disposition: form-data; name="image"; filename="%s"\r\n'
                   "Content-Type: %s\r\n\r\n" % (filename, mime)).encode() + photo + b"\r\n",
            ("--" + boundary + "--\r\n").encode(),
        ]
        body = b"".join(parts)
        req = urllib.request.Request(
            "https://api.openai.com/v1/images/edits",
            data=body,
            headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "multipart/form-data; boundary=" + boundary,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("error", {}).get("message", "")
            except Exception:
                pass
            self._write_json(502, {"ok": False, "error": "OpenAI returned %s. %s" % (exc.code, detail[:300])})
            return
        except Exception:
            self._write_json(502, {"ok": False, "error": "Could not reach OpenAI. Check your connection."})
            return
        item = (payload.get("data") or [{}])[0]
        b64 = item.get("b64_json")
        if not b64:
            self._write_json(502, {"ok": False, "error": "OpenAI did not return an image."})
            return
        self._write_json(200, {"ok": True, "image": "data:image/png;base64," + b64})

    def _read_json(self, cap: int = MAX_BODY) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length < 2 or length > cap:
            raise ValueError("bad length")
        raw = self.rfile.read(length)
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("not an object")
        return data

    def _write_json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_otp(self) -> None:
        try:
            data = self._read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            self._write_json(400, {"ok": False, "error": "Invalid request."})
            return
        email = str(data.get("email") or "").strip().lower()
        if not EMAIL_RE.match(email) or not email.endswith("@amdocs.com"):
            self._write_json(400, {"ok": False, "error": "Use your @amdocs.com email."})
            return
        mail = load_json(MAIL_PATH, None)
        if not isinstance(mail, dict) or not mail.get("host") or not mail.get("user") or not mail.get("password"):
            self._write_json(503, {
                "ok": False,
                "error": "Mail is not configured. Copy mail.json.example to mail.json and add your SMTP login."
            })
            return
        now = time.time()
        otp = f"{secrets.randbelow(1_000_000):06d}"
        with _lock:
            store = load_json(OTP_PATH, {})
            rec = store.get(email) or {}
            if rec.get("sent_at") and now - float(rec["sent_at"]) < RESEND_WAIT:
                self._write_json(429, {"ok": False, "error": "Wait a minute before requesting another code."})
                return
            store[email] = {
                "hash": digest(email + ":" + otp),
                "exp": now + OTP_TTL,
                "tries": 0,
                "sent_at": now,
                "ticket": None,
            }
            save_json(OTP_PATH, store)
        try:
            send_mail(mail, email, otp)
        except Exception:
            with _lock:
                store = load_json(OTP_PATH, {})
                store.pop(email, None)
                save_json(OTP_PATH, store)
            self._write_json(502, {
                "ok": False,
                "error": "Could not send email. Check SMTP host, port, and app password."
            })
            return
        self._write_json(200, {"ok": True})

    def _verify_otp(self) -> None:
        try:
            data = self._read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            self._write_json(400, {"ok": False, "error": "Invalid request."})
            return
        email = str(data.get("email") or "").strip().lower()
        otp = str(data.get("otp") or "").strip()
        if not EMAIL_RE.match(email) or not re.fullmatch(r"\d{6}", otp):
            self._write_json(400, {"ok": False, "error": "Enter the 6-digit code from your email."})
            return
        now = time.time()
        with _lock:
            store = load_json(OTP_PATH, {})
            rec = store.get(email)
            if not rec:
                self._write_json(400, {"ok": False, "error": "No active code for this email. Request a new one."})
                return
            if now > float(rec.get("exp") or 0):
                store.pop(email, None)
                save_json(OTP_PATH, store)
                self._write_json(400, {"ok": False, "error": "That code expired. Request a new one."})
                return
            tries = int(rec.get("tries") or 0)
            if tries >= MAX_TRIES:
                store.pop(email, None)
                save_json(OTP_PATH, store)
                self._write_json(400, {"ok": False, "error": "Too many attempts. Request a new code."})
                return
            if rec.get("hash") != digest(email + ":" + otp):
                rec["tries"] = tries + 1
                store[email] = rec
                save_json(OTP_PATH, store)
                left = MAX_TRIES - rec["tries"]
                self._write_json(400, {"ok": False, "error": "Wrong code. " + str(left) + " tries left."})
                return
            ticket = secrets.token_urlsafe(24)
            rec["ticket"] = digest(email + ":" + ticket)
            rec["hash"] = None
            rec["exp"] = now + OTP_TTL
            rec["tries"] = 0
            store[email] = rec
            save_json(OTP_PATH, store)
        self._write_json(200, {"ok": True, "ticket": ticket})

    def _consume_reset(self) -> None:
        try:
            data = self._read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            self._write_json(400, {"ok": False, "error": "Invalid request."})
            return
        email = str(data.get("email") or "").strip().lower()
        ticket = str(data.get("ticket") or "")
        if not EMAIL_RE.match(email) or not ticket:
            self._write_json(400, {"ok": False, "error": "Reset session is missing."})
            return
        with _lock:
            store = load_json(OTP_PATH, {})
            rec = store.get(email) or {}
            if rec.get("ticket") != digest(email + ":" + ticket):
                self._write_json(400, {"ok": False, "error": "Reset session expired. Start again."})
                return
            store.pop(email, None)
            save_json(OTP_PATH, store)
        self._write_json(200, {"ok": True})


def main() -> None:
    port = 8765
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("AMFIT at http://127.0.0.1:%s" % port)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
