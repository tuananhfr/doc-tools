"""Re-read local PaddleOCR text polygons with the Vietnamese-specific VietOCR model.

This is an experiment, not an application endpoint. No image or text is uploaded.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
import unicodedata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("paddle_result", type=Path)
    parser.add_argument("--weights", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--base-config", type=Path, required=True)
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    output = args.paddle_result.parent
    os.environ["TORCH_HOME"] = str(output / "cache/torch")
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

    import cv2
    import numpy as np
    import torch
    import yaml
    from PIL import Image
    from vietocr.tool.predictor import Predictor

    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    raw = json.loads(args.paddle_result.read_text(encoding="utf-8"))
    image_bytes = args.image.read_bytes()
    if hashlib.sha256(image_bytes).hexdigest() != raw["input"]["sha256"]:
        raise ValueError("Paddle polygons do not belong to this image")
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    config = yaml.safe_load(args.base_config.read_text(encoding="utf-8"))
    config.update(yaml.safe_load(args.config.read_text(encoding="utf-8")))
    config["weights"] = str(args.weights.resolve())
    config["device"] = "cpu"
    config["cnn"]["pretrained"] = False
    config["predictor"]["beamsearch"] = False
    config["dataset"]["image_max_width"] = 512
    started = time.perf_counter()
    engine = Predictor(config)
    initialized = time.perf_counter() - started
    lines = []
    started = time.perf_counter()
    for index, line in enumerate(raw["lines"]):
        points = np.asarray(line["polygon"], dtype=np.float32)
        width = max(2, int(round(max(np.linalg.norm(points[1] - points[0]), np.linalg.norm(points[2] - points[3])))))
        height = max(2, int(round(max(np.linalg.norm(points[3] - points[0]), np.linalg.norm(points[2] - points[1])))))
        target = np.asarray([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32)
        crop = cv2.warpPerspective(image, cv2.getPerspectiveTransform(points, target), (width, height), borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
        # Keep long lines within the recognizer's trained width range. Split at image
        # whitespace, never at a guessed word from another OCR engine or a reference.
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        background = cv2.GaussianBlur(gray, (0, 0), max(3, height / 2))
        ink = gray.astype(np.float32) < background.astype(np.float32) - 12
        projection = ink[max(1, height // 10):max(2, height * 9 // 10)].sum(axis=0)
        maximum = max(64, height * 13)
        spaces, gap_start = [], None
        for x in range(width + 1):
            if x < width and projection[x] == 0:
                if gap_start is None:
                    gap_start = x
            elif gap_start is not None:
                if x - gap_start >= max(3, round(height * .18)):
                    spaces.append((gap_start + x) // 2)
                gap_start = None
        cuts, left = [0], 0
        while width - left > maximum:
            candidates = [x for x in spaces if left + maximum // 2 <= x < min(width - 1, left + maximum)]
            if not candidates:
                break  # Do not cut through a word when no safe gap was found.
            left = candidates[-1]
            cuts.append(left)
        cuts.append(width)
        readings, scores = [], []
        for left, right in zip(cuts, cuts[1:]):
            part = crop[:, left:right]
            value, probability = engine.predict(Image.fromarray(cv2.cvtColor(part, cv2.COLOR_BGR2RGB)), return_prob=True)
            readings.append(value.strip()); scores.append(float(probability))
        reading = " ".join(value for value in readings if value)
        confidence = sum(score * len(text) for text, score in zip(readings, scores)) / max(1, sum(map(len, readings)))
        # A clear numeric-only value stays numeric; the language model must not turn 1 into I.
        keep_numeric = line["confidence"] >= .9 and re.fullmatch(r"[\d\s.,:/%+()-]+", line["text"]) is not None
        text = unicodedata.normalize("NFC", reading)
        dates = re.findall(r"\b\d{1,2}/\d{1,2}/\d{4}\b", line["text"])
        keep_date = bool(dates) and line["confidence"] >= .9 and not all(date in text for date in dates)
        if keep_date:
            text = line["text"]
        if line["confidence"] >= .9:
            # Preserve a confident printed document identifier instead of allowing a
            # language model to change its zeros or digits while adding Vietnamese marks.
            for code in re.findall(r"\b[A-Z]{2,}(?:[./_-][A-Z0-9]+)+\b", line["text"]):
                if len(re.findall(r"\d", code)) >= 3:
                    prefix = re.split(r"[./_-]", code)[0]
                    text = re.sub(r"\b" + re.escape(prefix) + r"(?:[./_-][A-Z0-9]+)+\b", lambda _match: code, text)
            letters = re.findall(r"[^\W\d_]", line["text"])
            if letters and all(letter.isupper() for letter in letters):
                text = text.upper()
            number = re.search(r"\s(\d+)\s*$", line["text"])
            if number and re.search(r"\s[lI]\s*$", text):
                text = re.sub(r"\s[lI]\s*$", " " + number.group(1), text)
        lines.append({**line, "text": line["text"] if keep_numeric else text,
                      "confidence": line["confidence"] if keep_numeric else float(confidence),
                      "paddleText": line["text"], "vietocrText": reading, "vietocrConfidence": float(confidence), "keptNumeric": keep_numeric, "keptDate": keep_date})
        if (index + 1) % 10 == 0:
            print(f"Read {index + 1}/{len(raw['lines'])} regions", flush=True)
    elapsed = time.perf_counter() - started
    report = {**raw, "engine": "PaddleOCR detection + VietOCR recognition", "variant": "mobile-vietocr",
              "recognizer": "VietOCR vgg_seq2seq", "initializationSeconds": initialized,
              "inferenceSeconds": [elapsed], "timingScope": "VietOCR re-reading only; reuses Paddle polygons; excludes the preceding Paddle pass",
              "weightSha256": hashlib.sha256(args.weights.read_bytes()).hexdigest(), "lines": lines}
    (output / "raw-mobile-vietocr.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / "raw-mobile-vietocr.txt").write_text("\n".join(line["text"] for line in lines), encoding="utf-8")
    print(json.dumps({"lines": len(lines), "initializationSeconds": initialized, "recognitionSeconds": elapsed}), flush=True)


if __name__ == "__main__":
    main()
