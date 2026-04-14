from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, TypedDict

import cv2
import face_recognition
import numpy as np
import json

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="nserve-face-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_image_bytes(upload: UploadFile) -> np.ndarray:
    raw = upload.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Image is required")
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Unreadable image")
    return img


def _single_face_encoding(bgr: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    boxes = face_recognition.face_locations(rgb, model="hog")
    if len(boxes) == 0:
        raise HTTPException(status_code=400, detail="No face detected")
    if len(boxes) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected")
    encs = face_recognition.face_encodings(rgb, known_face_locations=boxes)
    if not encs:
        raise HTTPException(status_code=400, detail="Could not compute face encoding")
    return encs[0]


class EncodeResponse(BaseModel):
    encoding: List[float]


class Candidate(BaseModel):
    userId: str
    encoding: List[float]


class MatchCandidates(BaseModel):
    candidates: List[Candidate]
    threshold: Optional[float] = 0.6


class MatchResponse(BaseModel):
    userId: Optional[str] = None
    distance: Optional[float] = None


@app.post("/encode-face", response_model=EncodeResponse)
async def encode_face(image: UploadFile = File(...)) -> EncodeResponse:
    bgr = _read_image_bytes(image)
    enc = _single_face_encoding(bgr)
    return EncodeResponse(encoding=[float(x) for x in enc.tolist()])


@app.post("/match-face", response_model=MatchResponse)
async def match_face(
    image: UploadFile = File(...),
    candidates: str = Form(...),
) -> MatchResponse:
    bgr = _read_image_bytes(image)
    probe = _single_face_encoding(bgr)

    try:
        parsed = MatchCandidates.model_validate_json(candidates)
    except Exception:
        try:
            parsed = MatchCandidates.model_validate(json.loads(candidates))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid candidates payload")

    if not parsed.candidates:
        return MatchResponse(userId=None, distance=None)

    best_user: Optional[str] = None
    best_dist: float = 10_000.0
    for c in parsed.candidates:
        try:
            known = np.array(c.encoding, dtype=np.float64)
            if known.shape[0] != 128:
                continue
            dist = float(np.linalg.norm(known - probe))
            if dist < best_dist:
                best_dist = dist
                best_user = c.userId
        except Exception:
            continue

    thr = float(parsed.threshold or 0.6)
    if best_user is None or best_dist > thr:
        return MatchResponse(userId=None, distance=best_dist if best_user else None)
    return MatchResponse(userId=best_user, distance=best_dist)


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"ok": True}

