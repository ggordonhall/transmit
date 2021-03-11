from typing import List, Tuple

import base64

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from translate import detect_and_translate

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_b64(str_base64_img):
    idx = str_base64_img.index(',')
    return str_base64_img[idx + 1:]


def decode_image(str_base64_img):
    base64_img = str_base64_img.encode()
    return base64.b64decode(base64_img)


class Image(BaseModel):
    target_lang: str
    str_base64_img: str


class Translate(BaseModel):
    detected_text: List[str]
    translation: List[str]
    translation_bounds: List[List[Tuple[int, int]]]
    detected_languages: List[List[str]]


@app.post("/trans", response_model=Translate)
async def translate(img: Image):
    print(img.str_base64_img)
    b64_img = decode_image(extract_b64(img.str_base64_img))
    print(b64_img)
    print(img.target_lang)
    text, translation, bounds, detected_langs = detect_and_translate(
        b64_img, img.target_lang)
    print(text)
    print(translation)
    print(bounds)
    print(detected_langs)
    return {
        'detected_text': text,
        'translation': translation,
        'translation_bounds': bounds,
        'detected_languages': detected_langs
    }


if __name__ == '__main__':
    import os
    from starlette.testclient import TestClient

    with open('../translate/img/borda.jpg', 'rb') as img:
        encoded = base64.b64encode(img.read()).decode()

    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'My Project-1dee666402a8.json'

    client = TestClient(app)
    payload = {'target_lang': 'en', 'str_base64_img': encoded}
    resp = client.post("/trans", json=payload)
    print(resp.json())
