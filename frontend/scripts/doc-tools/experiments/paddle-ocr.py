"""Run a local PaddleOCR trial. Input images are never sent to an OCR service."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("--detector", choices=("mobile", "server"), default="mobile")
    parser.add_argument("--repeat", type=int, default=2)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    output = args.output or root / "qa-output/document-scanner-v3/paddle-experiment"
    output.mkdir(parents=True, exist_ok=True)
    cache = output / "cache"
    # All downloaded models/caches stay inside the experiment directory.
    for key, folder in {
        "PADDLE_PDX_CACHE_HOME": "paddlex", "PADDLE_HOME": "paddle",
        "HF_HOME": "huggingface", "MODELSCOPE_CACHE": "modelscope",
        "XDG_CACHE_HOME": "xdg", "PADDLE_EXTENSION_DIR": "extensions",
    }.items():
        os.environ[key] = str(cache / folder)
    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    os.environ["PYTHONUTF8"] = "1"
    sys.stdout.reconfigure(encoding="utf-8")

    import cv2
    import numpy as np
    from paddleocr import PaddleOCR

    image_bytes = args.image.read_bytes()
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Cannot decode the input image")
    height, width = image.shape[:2]
    started = time.perf_counter()
    engine = PaddleOCR(
        text_detection_model_name=f"PP-OCRv5_{args.detector}_det",
        text_recognition_model_name="latin_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_det_limit_side_len=1280,
        text_det_limit_type="max",
        text_rec_score_thresh=0.0,
        device="cpu", cpu_threads=4, enable_mkldnn=False,
    )
    initialized = time.perf_counter() - started
    timings, first = [], None
    for _ in range(max(1, min(args.repeat, 3))):
        started = time.perf_counter()
        results = engine.predict(image)
        timings.append(time.perf_counter() - started)
        if len(results) != 1:
            raise ValueError(f"Expected one result, got {len(results)}")
        if first is None:
            result = results[0]
            first = [
                {"text": str(text), "confidence": float(score), "polygon": polygon.tolist()}
                for text, score, polygon in zip(
                    result["rec_texts"], result["rec_scores"], result["rec_polys"], strict=True
                )
            ]
    report = {
        "engine": "PaddleOCR", "detector": f"PP-OCRv5_{args.detector}_det",
        "recognizer": "latin_PP-OCRv5_mobile_rec", "device": "cpu", "threads": 4,
        "versions": {package: importlib.metadata.version(package) for package in ("paddleocr", "paddlepaddle", "paddlex")},
        "input": {"name": args.image.name, "sha256": hashlib.sha256(image_bytes).hexdigest(), "width": width, "height": height},
        "initializationSeconds": initialized, "inferenceSeconds": timings,
        "lines": first,
    }
    (output / f"raw-{args.detector}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / f"raw-{args.detector}.txt").write_text("\n".join(line["text"] for line in first), encoding="utf-8")
    print(json.dumps({"detector": args.detector, "lines": len(first), "initializationSeconds": initialized, "inferenceSeconds": timings}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
