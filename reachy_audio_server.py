from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DAEMON = "http://localhost:8000"

SOUNDS = {
    "bravo": os.path.join(
        BASE_DIR,
        "sound",
        "bravo-kid.mp3",
    ),

    "encouragement": os.path.join(
        BASE_DIR,
        "sound",
        "courage-kid.mp3",
    ),
}

# chemin du fichier une fois uploadé sur Reachy
REMOTE_SOUNDS = {}


def upload_sound_once(sound_name: str):
    if sound_name in REMOTE_SOUNDS:
        return REMOTE_SOUNDS[sound_name]

    path = SOUNDS[sound_name]

    if not os.path.exists(path):
        raise FileNotFoundError(path)

    print("Upload du son :", path)

    with open(path, "rb") as f:
        response = requests.post(
            f"{DAEMON}/api/media/sounds/upload",
            files={
                "file": (
                    os.path.basename(path),
                    f,
                )
            },
            timeout=30,
        )

    print(
        "Upload response :",
        response.status_code,
        response.text,
    )

    # Si l'upload réussit normalement
    if response.ok:
        data = response.json()

        remote_path = data["path"]

        REMOTE_SOUNDS[sound_name] = remote_path

        print(
            "Son Reachy enregistré :",
            remote_path,
        )

        return remote_path

    # Si Reachy renvoie 500 mais que le fichier
    # existe déjà côté daemon, on tente directement
    # son emplacement temporaire standard.
    filename = os.path.basename(path)

    remote_path = (
        f"/tmp/reachy_mini_sounds/{filename}"
    )

    print(
        "Upload erreur, tentative avec :",
        remote_path,
    )

    REMOTE_SOUNDS[sound_name] = remote_path

    return remote_path


@app.get("/")
def root():
    return {
        "status": "Reachy audio server running"
    }


@app.post("/sound/{sound_name}")
def play_sound(sound_name: str):

    if sound_name not in SOUNDS:
        return {
            "error": "Son inconnu"
        }

    try:
        remote_path = upload_sound_once(
            sound_name
        )

        print(
            "Lecture Reachy :",
            remote_path,
        )

        response = requests.post(
            f"{DAEMON}/api/media/play_sound",
            json={
                "file": remote_path
            },
            timeout=10,
        )

        print(
            "Play response :",
            response.status_code,
            response.text,
        )

        response.raise_for_status()

        return {
            "status": "playing",
            "sound": sound_name,
        }

    except Exception as error:
        print(
            "ERREUR AUDIO :",
            error,
        )

        return {
            "error": str(error)
        }