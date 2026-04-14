## Face Recognition Service (FastAPI)

This is a **separate microservice** used by the Spring Boot API for Face ID registration + login.

### Run locally

```bash
cd face-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### API

- `POST /encode-face` (multipart form field `image`) → `{ encoding: number[128] }`
- `POST /match-face` (multipart `image` + `candidates` JSON) → `{ userId, distance }`

### Spring Boot config

Set env var:

- `FACE_SERVICE_URL=http://localhost:8001`

