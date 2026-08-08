#!/usr/bin/env python3
"""Convert one uncompressed DICOM series into metadata-free WebP cine frames."""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


LONG_VALUE_REPRESENTATIONS = {b"OB", b"OD", b"OF", b"OL", b"OV", b"OW", b"SQ", b"UC", b"UR", b"UT", b"UN"}


def read_element(data: bytes, group: int, element: int) -> tuple[bytes, bytes] | None:
    tag = struct.pack("<HH", group, element)
    search_from = 132
    while True:
        offset = data.find(tag, search_from)
        if offset < 0:
            return None
        value_representation = data[offset + 4 : offset + 6]
        if len(value_representation) != 2 or not value_representation.isalpha():
            search_from = offset + 1
            continue
        if value_representation in LONG_VALUE_REPRESENTATIONS:
            if offset + 12 > len(data):
                return None
            length = struct.unpack_from("<I", data, offset + 8)[0]
            value_offset = offset + 12
        else:
            if offset + 8 > len(data):
                return None
            length = struct.unpack_from("<H", data, offset + 6)[0]
            value_offset = offset + 8
        if length == 0xFFFFFFFF or value_offset + length > len(data):
            search_from = offset + 1
            continue
        return value_representation, data[value_offset : value_offset + length]


def text_value(data: bytes, group: int, element: int, default: str = "") -> str:
    result = read_element(data, group, element)
    if not result:
        return default
    return result[1].decode("utf-8", errors="ignore").strip(" \0")


def number_value(data: bytes, group: int, element: int, default: float = 0) -> float:
    result = read_element(data, group, element)
    if not result:
        return default
    value_representation, raw = result
    if value_representation == b"US" and len(raw) >= 2:
        return float(struct.unpack_from("<H", raw)[0])
    if value_representation == b"SS" and len(raw) >= 2:
        return float(struct.unpack_from("<h", raw)[0])
    value = raw.decode("ascii", errors="ignore").strip(" \0").split("\\")[0]
    try:
        return float(value)
    except ValueError:
        return default


def decode_pixels(data: bytes) -> tuple[np.ndarray, dict[str, Any]]:
    transfer_syntax = text_value(data, 0x0002, 0x0010)
    if transfer_syntax not in {"1.2.840.10008.1.2.1", "1.2.840.10008.1.2"}:
        raise ValueError(f"Unsupported compressed transfer syntax: {transfer_syntax or 'unknown'}")

    rows = int(number_value(data, 0x0028, 0x0010))
    columns = int(number_value(data, 0x0028, 0x0011))
    bits_allocated = int(number_value(data, 0x0028, 0x0100, 16))
    bits_stored = int(number_value(data, 0x0028, 0x0101, bits_allocated))
    pixel_representation = int(number_value(data, 0x0028, 0x0103, 0))
    samples_per_pixel = int(number_value(data, 0x0028, 0x0002, 1))
    if rows <= 0 or columns <= 0 or samples_per_pixel != 1 or bits_allocated not in {8, 16}:
        raise ValueError(f"Unsupported pixel layout: {columns}x{rows}, {bits_allocated}-bit, {samples_per_pixel} samples")

    pixel_element = read_element(data, 0x7FE0, 0x0010)
    if not pixel_element:
        raise ValueError("Pixel Data element not found")
    pixel_bytes = pixel_element[1]
    if bits_allocated == 8:
        dtype = np.int8 if pixel_representation else np.uint8
    else:
        dtype = np.dtype("<i2") if pixel_representation else np.dtype("<u2")
    expected = rows * columns
    pixels = np.frombuffer(pixel_bytes, dtype=dtype, count=expected).reshape(rows, columns)
    if not pixel_representation and bits_stored < bits_allocated:
        pixels = pixels & ((1 << bits_stored) - 1)

    slope = number_value(data, 0x0028, 0x1053, 1)
    intercept = number_value(data, 0x0028, 0x1052, 0)
    pixels = pixels.astype(np.float32) * slope + intercept
    center = number_value(data, 0x0028, 0x1050, float("nan"))
    width = number_value(data, 0x0028, 0x1051, float("nan"))
    if np.isfinite(center) and np.isfinite(width) and width > 1:
        lower = center - width / 2
        upper = center + width / 2
    else:
        finite = pixels[np.isfinite(pixels)]
        lower, upper = np.percentile(finite, [0.5, 99.5]) if finite.size else (0, 1)
    if upper <= lower:
        upper = lower + 1
    image = np.clip((pixels - lower) / (upper - lower), 0, 1)
    if text_value(data, 0x0028, 0x0004).upper() == "MONOCHROME1":
        image = 1 - image

    slice_thickness = number_value(data, 0x0018, 0x0050, 1)
    metadata = {
        "rows": rows,
        "columns": columns,
        "instanceNumber": int(number_value(data, 0x0020, 0x0013, 0)),
        "sliceLocation": number_value(data, 0x0020, 0x1041, 0),
        "sliceThickness": slice_thickness,
        "spacingBetweenSlices": number_value(data, 0x0018, 0x0088, slice_thickness),
        "seriesDescription": text_value(data, 0x0008, 0x103E),
        "protocolName": text_value(data, 0x0018, 0x1030),
        "seriesNumber": text_value(data, 0x0020, 0x0011),
    }
    return np.rint(image * 255).astype(np.uint8), metadata


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--sequence-id", type=int, required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--plane", choices=("axial", "coronal", "sagittal"), required=True)
    parser.add_argument("--fps", type=int, default=8)
    parser.add_argument("--filename-prefix", default="")
    parser.add_argument("--output-root", type=Path, default=Path("public/protocol-series"))
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    source_files = sorted(
        path for path in args.source.iterdir()
        if path.is_file() and path.suffix.lower() == ".dcm" and path.name.startswith(args.filename_prefix)
    )
    if not source_files:
        raise SystemExit(f"No DICOM files found in {args.source}")

    decoded: list[tuple[int, str, np.ndarray, dict[str, Any]]] = []
    for source_path in source_files:
        image, metadata = decode_pixels(source_path.read_bytes())
        decoded.append((metadata["instanceNumber"], source_path.name, image, metadata))
    decoded.sort(key=lambda item: (item[0], item[1]))

    output_directory = args.output_root / args.id
    output_directory.mkdir(parents=True, exist_ok=True)
    frames: list[str] = []
    for index, (_, _, image, _) in enumerate(decoded, start=1):
        filename = f"frame-{index:03d}.webp"
        Image.fromarray(image, mode="L").save(output_directory / filename, "WEBP", quality=88, method=6)
        frames.append(f"/protocol-series/{args.id}/{filename}")

    representative = decoded[len(decoded) // 2][3]
    manifest = {
        "id": args.id,
        "sequenceId": args.sequence_id,
        "name": args.name,
        "plane": args.plane,
        "frameCount": len(frames),
        "fps": args.fps,
        "thumbnail": frames[len(frames) // 2],
        "frames": frames,
        "rows": representative["rows"],
        "columns": representative["columns"],
        "sliceThickness": representative["sliceThickness"],
        "spacingBetweenSlices": representative["spacingBetweenSlices"],
    }
    (output_directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    catalog_path = args.output_root / "manifest.json"
    catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else []
    catalog = [item for item in catalog if item.get("id") != args.id]
    catalog.append(manifest)
    for item in catalog:
        item.pop("seriesDescription", None)
        item.pop("protocolName", None)
    catalog.sort(key=lambda item: item["sequenceId"])
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n")

    # Remove source scanner labels from every public manifest. The website keeps
    # only MRI Pro display names and technical frame geometry.
    for manifest_path in args.output_root.glob("*/manifest.json"):
        public_manifest = json.loads(manifest_path.read_text())
        public_manifest.pop("seriesDescription", None)
        public_manifest.pop("protocolName", None)
        manifest_path.write_text(json.dumps(public_manifest, indent=2) + "\n")

    print(json.dumps({"id": args.id, "frames": len(frames), "rows": manifest["rows"], "columns": manifest["columns"], "series": representative["seriesDescription"]}))


if __name__ == "__main__":
    main()
