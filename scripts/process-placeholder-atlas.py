"""Extract the approved placeholder subset from the 4x3 AI-assisted source atlas."""

from __future__ import annotations

import argparse
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ASSETS = {
    "environment.tree.snowy-pine": (0, 0),
    "character.player.blue": (1, 0),
    "enemy.bear.gray": (2, 0),
    "environment.fence.timber": (3, 0),
    "building.turret.crossbow": (0, 1),
    "building.furnace.camp": (1, 1),
    "resource.wood.stack": (2, 1),
    "resource.meat.single": (3, 1),
    "ui.icon.resource-money": (3, 2),
    "ui.icon.resource-wood": (1, 2),
    "ui.icon.resource-meat": (2, 2),
}

TRANSPARENT_DISTANCE = 42.0
OPAQUE_DISTANCE = 118.0


def pixel_data(image: Image.Image):
    flattened = getattr(image, "get_flattened_data", None)
    return flattened() if flattened else image.getdata()


def despill_magenta(image: Image.Image) -> Image.Image:
    cleaned = []
    for red, green, blue, alpha in pixel_data(image):
        if (
            alpha > 0
            and min(red, blue) > green + 18
            and abs(red - blue) < 45
        ):
            red = min(red, green + 8)
            blue = min(blue, green + 8)
        cleaned.append((red, green, blue, alpha))
    image.putdata(cleaned)
    return image


def key_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []

    for red, green, blue, _ in pixel_data(rgba):
        distance = math.sqrt((red - 255) ** 2 + green**2 + (blue - 255) ** 2)
        alpha = round(
            255
            * max(
                0.0,
                min(
                    1.0,
                    (distance - TRANSPARENT_DISTANCE)
                    / (OPAQUE_DISTANCE - TRANSPARENT_DISTANCE),
                ),
            )
        )

        if 0 < alpha < 255:
            coverage = alpha / 255
            red = round(max(0, min(255, (red - 255 * (1 - coverage)) / coverage)))
            green = round(max(0, min(255, green / coverage)))
            blue = round(max(0, min(255, (blue - 255 * (1 - coverage)) / coverage)))

        pixels.append((red, green, blue, alpha))

    rgba.putdata(pixels)
    return despill_magenta(rgba)


def keep_largest_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    visible = bytearray(1 if value > 8 else 0 for value in pixel_data(alpha))
    visited = bytearray(width * height)
    largest = []

    for start in range(width * height):
        if not visible[start] or visited[start]:
            continue

        component = []
        stack = [start]
        visited[start] = 1
        while stack:
            index = stack.pop()
            component.append(index)
            x = index % width
            y = index // width
            for neighbor in (
                index - 1 if x > 0 else -1,
                index + 1 if x + 1 < width else -1,
                index - width if y > 0 else -1,
                index + width if y + 1 < height else -1,
            ):
                if neighbor >= 0 and visible[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    stack.append(neighbor)

        if len(component) > len(largest):
            largest = component

    original_alpha = bytes(pixel_data(alpha))
    keep = bytearray(width * height)
    for index in largest:
        keep[index] = original_alpha[index]

    cleaned = image.copy()
    cleaned.putalpha(Image.frombytes("L", image.size, bytes(keep)))
    return cleaned


def trim_to_subject(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bbox is None:
        raise ValueError("cell contains no visible subject after chroma key removal")
    return image.crop(bbox)


def place_on_manifest_canvas(
    subject: Image.Image, width: int, height: int, origin_x: float, origin_y: float
) -> Image.Image:
    padding = 4
    base_x = round(width * origin_x)
    base_y = round(height * origin_y)
    max_width = width - padding * 2
    max_height = base_y - padding
    scale = min(max_width / subject.width, max_height / subject.height, 1.0)
    resized = subject.convert("RGBa").resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    resized = despill_magenta(resized)

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    left = round(base_x - resized.width / 2)
    top = base_y - resized.height
    canvas.alpha_composite(resized, (left, top))
    return canvas


def checkerboard(size: tuple[int, int], square: int = 8) -> Image.Image:
    image = Image.new("RGB", size, "#d9e2e8")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], square):
        for x in range(0, size[0], square):
            if (x // square + y // square) % 2:
                draw.rectangle((x, y, x + square - 1, y + square - 1), fill="#f4f7f9")
    return image


def write_contact_sheet(
    rendered: list[tuple[dict, Image.Image]], output_path: Path
) -> None:
    columns = 4
    cell_width = 290
    cell_height = 320
    rows = math.ceil(len(rendered) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#26343b")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, (asset, image) in enumerate(rendered):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = row * cell_height
        preview = checkerboard((cell_width - 20, 250))
        scale = min(240 / image.width, 230 / image.height, 1.5)
        scaled = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.NEAREST,
        )
        paste_x = (preview.width - scaled.width) // 2
        paste_y = (preview.height - scaled.height) // 2
        preview.paste(scaled, (paste_x, paste_y), scaled)
        sheet.paste(preview, (x + 10, y + 10))

        base_x = x + 10 + paste_x + round(asset["origin"]["x"] * image.width * scale)
        base_y = y + 10 + paste_y + round(asset["origin"]["y"] * image.height * scale)
        draw.line((base_x - 7, base_y, base_x + 7, base_y), fill="#ff3b30", width=2)
        draw.line((base_x, base_y - 7, base_x, base_y + 7), fill="#ff3b30", width=2)
        draw.text((x + 10, y + 268), asset["id"], fill="white", font=font)
        draw.text(
            (x + 10, y + 286),
            f'{image.width}x{image.height} origin {asset["origin"]["x"]},{asset["origin"]["y"]}',
            fill="#bbdce8",
            font=font,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args()

    repo = args.repo.resolve()
    source = args.source.resolve()
    manifest_path = repo / "public" / "assets" / "manifest.json"
    review_dir = repo / "docs" / "assets" / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    review_source = (review_dir / "source-atlas.png").resolve()
    if source != review_source:
        shutil.copyfile(source, review_source)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    by_id = {asset["id"]: asset for asset in manifest["assets"]}
    atlas = Image.open(source).convert("RGBA")
    if atlas.size != (1448, 1086):
        raise ValueError(f"expected a 1448x1086 atlas, got {atlas.size}")

    cell_width = atlas.width // 4
    cell_height = atlas.height // 3
    rendered = []

    for asset_id, (column, row) in ASSETS.items():
        asset = by_id[asset_id]
        cell = atlas.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        subject = trim_to_subject(keep_largest_component(key_magenta(cell)))
        canvas = place_on_manifest_canvas(
            subject,
            asset["canvas"]["width"],
            asset["canvas"]["height"],
            asset["origin"]["x"],
            asset["origin"]["y"],
        )
        output_path = repo / "public" / "assets" / asset["path"]
        output_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output_path, optimize=True)
        rendered.append((asset, canvas))

    write_contact_sheet(rendered, review_dir / "placeholder-pack-contact-sheet.png")
    print(f"Rendered {len(rendered)} assets and review evidence from {source.name}.")


if __name__ == "__main__":
    main()
