from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from playlistSorter import PlaylistSorter
from pydantic import BaseModel
#COMMAND AND HAS TO BE IN THE BACKEND: python -m uvicorn mainbackend:app --reload --host 127.0.0.1 --port 8000
# Create the FastAPI application
app = FastAPI()

# Allow JavaScript to communicate with Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Test endpoint
@app.get("/api/health")
def health():
    return {
        "status": "online",
        "message": "Spotify AI backend is running!"
    }
# =====================================
# SONG DATA MODEL
# =====================================

class Song(BaseModel):
    name: str
    artist: str
    duration: int
    release_date: str


class SortRequest(BaseModel):
    songs: list[Song]
    method: Literal[
        "name",
        "artist",
        "duration",
        "release_date"
    ]


# =====================================
# SORT PLAYLIST
# =====================================

@app.post("/api/sort")
def sort_playlist(request: SortRequest):

    songs = [
        song.model_dump()
        for song in request.songs
    ]

    sorter = PlaylistSorter(songs)

    sorted_songs = sorter.sort(request.method)

    return {
        "status": "success",
        "method": request.method,
        "songs": sorted_songs
    }
# =====================================
# CHAT REQUEST MODEL
# =====================================

class ChatRequest(BaseModel):
    message: str


# =====================================
# CHAT ENDPOINT
# =====================================

@app.post("/api/chat")
def chat(request: ChatRequest):

    message = request.message.lower()

    if "workout" in message or "gym" in message:
        reply = "You want an energetic workout playlist!"

    elif "chill" in message or "relax" in message:
        reply = "You want a relaxing playlist!"

    elif "study" in message:
        reply = "You want music suitable for studying!"

    else:
        reply = "Tell me what kind of playlist you want!"

    return {
        "reply": reply
    }