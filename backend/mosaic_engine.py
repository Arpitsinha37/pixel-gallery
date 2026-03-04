"""
Mosaic Engine - Core image processing pipeline for generating emoji mosaics.
"""

import os
import math
import numpy as np
from PIL import Image
import cv2
from emoji_database import EmojiDatabase


class MosaicEngine:
    def __init__(self, emoji_db: EmojiDatabase):
        self.emoji_db = emoji_db

    def generate_preview(self, image_path: str, theme: str = "all") -> str:
        """
        Generate a quick low-resolution preview mosaic (~1000 emoji tiles).
        Returns path to the saved preview image.
        """
        return self._generate(
            image_path=image_path,
            tile_size=24,
            target_emoji_count=1000,
            theme=theme,
            output_suffix="_preview",
            progress_callback=None,
        )

    def generate_mosaic(
        self,
        image_path: str,
        tile_size: int = 16,
        density: int = 50000,
        theme: str = "all",
        progress_callback=None,
    ) -> str:
        """
        Generate a full high-resolution emoji mosaic.
        Returns path to the saved mosaic image.
        """
        return self._generate(
            image_path=image_path,
            tile_size=tile_size,
            target_emoji_count=density,
            theme=theme,
            output_suffix="_mosaic",
            progress_callback=progress_callback,
        )

    def _generate(
        self,
        image_path: str,
        tile_size: int,
        target_emoji_count: int,
        theme: str,
        output_suffix: str,
        progress_callback=None,
    ) -> str:
        """Core mosaic generation pipeline."""

        # ---- Step 1: Load source image ----
        if progress_callback:
            progress_callback(5, "Loading image...")

        src = cv2.imread(image_path)
        if src is None:
            raise ValueError(f"Could not load image: {image_path}")

        src_rgb = cv2.cvtColor(src, cv2.COLOR_BGR2RGB)
        h, w = src_rgb.shape[:2]

        # ---- Step 2: Compute grid dimensions from density ----
        aspect = w / h
        # target_emoji_count = cols * rows, and cols/rows = aspect
        # rows = sqrt(target_emoji_count / aspect)
        rows = int(math.sqrt(target_emoji_count / aspect))
        cols = int(rows * aspect)
        rows = max(1, rows)
        cols = max(1, cols)
        actual_count = rows * cols

        if progress_callback:
            progress_callback(10, f"Grid: {cols}x{rows} = {actual_count} emojis")

        # ---- Step 3: Resize source to grid dimensions ----
        small = cv2.resize(src_rgb, (cols, rows), interpolation=cv2.INTER_AREA)

        # ---- Step 4: Compute average color per block ----
        # Since we resized to exactly cols x rows, each pixel IS one block
        # Convert to float array for KDTree lookup
        pixel_colors = small.reshape(-1, 3).astype(np.float64)

        if progress_callback:
            progress_callback(20, "Matching emoji colors...")

        # ---- Step 5: KDTree batch nearest-neighbor lookup ----
        matched_filenames = self.emoji_db.find_closest_emojis_batch(
            pixel_colors, theme=theme
        )

        if progress_callback:
            progress_callback(40, "Rendering mosaic canvas...")

        # ---- Step 6: Render the mosaic canvas ----
        canvas_w = cols * tile_size
        canvas_h = rows * tile_size

        # Cap maximum canvas size to 12000x12000
        max_dim = 12000
        if canvas_w > max_dim or canvas_h > max_dim:
            scale = min(max_dim / canvas_w, max_dim / canvas_h)
            tile_size = max(4, int(tile_size * scale))
            canvas_w = cols * tile_size
            canvas_h = rows * tile_size

        # Create canvas with white background
        canvas = Image.new("RGB", (canvas_w, canvas_h), (255, 255, 255))

        total_tiles = rows * cols
        for idx, filename in enumerate(matched_filenames):
            row = idx // cols
            col = idx % cols

            # Get the emoji tile image (cached + resized)
            emoji_img = self.emoji_db.get_emoji_image(filename, size=tile_size)

            # Paste onto canvas
            x = col * tile_size
            y = row * tile_size

            # Handle RGBA by compositing over the white background
            if emoji_img.mode == "RGBA":
                # Create a white tile background
                tile_bg = Image.new("RGB", (tile_size, tile_size), (255, 255, 255))
                tile_bg.paste(emoji_img, (0, 0), emoji_img)
                canvas.paste(tile_bg, (x, y))
            else:
                canvas.paste(emoji_img, (x, y))

            # Report progress periodically
            if progress_callback and idx % max(1, total_tiles // 20) == 0:
                pct = 40 + int(55 * idx / total_tiles)
                progress_callback(pct, f"Rendering tile {idx+1}/{total_tiles}")

        # ---- Step 7: Save result ----
        if progress_callback:
            progress_callback(95, "Saving mosaic...")

        output_dir = os.path.join(os.path.dirname(image_path), "..", "outputs")
        os.makedirs(output_dir, exist_ok=True)

        base_name = os.path.splitext(os.path.basename(image_path))[0]
        output_filename = f"{base_name}{output_suffix}.png"
        output_path = os.path.join(output_dir, output_filename)

        canvas.save(output_path, "PNG", optimize=True)

        if progress_callback:
            progress_callback(100, "Done!")

        # Clear tile image cache to free memory
        self.emoji_db.clear_cache()

        print(f"Mosaic saved: {output_path} ({canvas_w}x{canvas_h}, {actual_count} tiles)")
        return output_filename
