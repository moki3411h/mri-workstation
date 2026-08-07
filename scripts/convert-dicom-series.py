#!/usr/bin/env python3
"""Convert local, uncompressed DICOM stacks into anonymized web cine frames."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
import pydicom


def first_number(value: Any, fallback: float) -> float:
    try:
        if isinstance(value, (list, tuple)):
            value = value[0]
        return float(value)
    except (TypeError, ValueError, IndexError):
        return fallback


def display_pixels(dataset: Any) -> np.ndarray:
    pixels = dataset.pixel_array.astype(np.float32)
    slope = first_number(getattr(dataset, "RescaleSlope", 1), 1)
    intercept = first_number(getattr(dataset, "RescaleIntercept", 0), 0)
    pixels = pixels * slope + intercept

    center = first_number(getattr(dataset, "WindowCenter", None), float("nan"))
    width = first_number(getattr(dataset, "WindowWidth", None), float("nan"))
    if np.isfinite(center) and np.isfinite(width) and width > 1:
        low = center - width / 2
        high = center + width / 2
    else:
        low, high = np.percentile(pixels, (1, 99.5))
        if high <= low:
            high = low + 1

    output = np.clip((pixels - low) / (high - low), 0, 1)
    if getattr(dataset, "PhotometricInterpretation", "MONOCHROME2") == "MONOCHROME1":
        output = 1 - output
    return np.round(output * 255).astype(np.uint8)


def read_series(source: Path) -> list[tuple[Any, Path]]:
    datasets: list[tuple[Any, Path]] = []
    for path in sorted(item for item in source.iterdir() if item.is_file()):
        try:
            dataset = pydicom.dcmread(path)
            if hasattr(dataset, "PixelData"):
                datasets.append((dataset, path))
        except Exception as error:
            print(f"Skipping {path.name}: {error}")

    datasets.sort(
        key=lambda item: (
            first_number(getattr(item[0], "InstanceNumber", None), float("inf")),
            item[1].name,
        )
    )
    return datasets


def convert_series(spec: str, output_root: Path) -> dict[str, Any]:
    parts = spec.split("|", 4)
    if len(parts) != 5:
        raise ValueError("Series must be slug|label|plane|sequenceId|sourcePath")
    slug, label, plane, sequence_id_text, source_text = parts
    source = Path(source_text)
    sequence_id = int(sequence_id_text)
    output_dir = output_root / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    datasets = read_series(source)
    if not datasets:
        raise RuntimeError(f"No readable pixel DICOM files found in {source}")

    frames: list[str] = []
    for index, (dataset, _) in enumerate(datasets, start=1):
        filename = f"frame-{index:03d}.webp"
        Image.fromarray(display_pixels(dataset), mode="L").save(
            output_dir / filename,
            "WEBP",
            lossless=True,
            method=6,
        )
        frames.append(f"/protocol-series/{slug}/{filename}")

    first = datasets[0][0]
    middle = frames[len(frames) // 2]
    manifest = {
        "id": slug,
        "sequenceId": sequence_id,
        "name": label,
        "plane": plane,
        "frameCount": len(frames),
        "fps": 8,
        "thumbnail": middle,
        "frames": frames,
        "rows": int(getattr(first, "Rows", 0)),
        "columns": int(getattr(first, "Columns", 0)),
        "sliceThickness": first_number(getattr(first, "SliceThickness", None), 0),
        "spacingBetweenSlices": first_number(getattr(first, "SpacingBetweenSlices", None), 0),
        "seriesDescription": str(getattr(first, "SeriesDescription", label)),
        "protocolName": str(getattr(first, "ProtocolName", label)),
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--series", action="append", required=True)
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    manifests = [convert_series(spec, args.output) for spec in args.series]
    (args.output / "manifest.json").write_text(json.dumps(manifests, indent=2) + "\n")
    for manifest in manifests:
        print(f"{manifest['name']}: {manifest['frameCount']} frames")


if __name__ == "__main__":
    main()
