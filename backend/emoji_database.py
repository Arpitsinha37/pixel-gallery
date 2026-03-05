"""
Emoji Database - Loads emoji tiles, computes average colors, and provides KDTree search.
"""

import os
import json
import numpy as np
from PIL import Image
from scipy.spatial import KDTree

TILES_DIR = os.path.join(os.path.dirname(__file__), "emoji_tiles")
COLORS_FILE = os.path.join(os.path.dirname(__file__), "emoji_colors.json")
THEME_MAP_FILE = os.path.join(TILES_DIR, "theme_map.json")


class EmojiDatabase:
    def __init__(self):
        self.emoji_colors = {}       # filename -> [r, g, b]
        self.emoji_images = {}       # filename -> PIL Image (cache)
        self.theme_map = {}          # filename -> [category, ...]
        self.kdtree = None
        self.filenames = []          # ordered list matching KDTree indices
        self._theme_trees = {}       # theme -> (KDTree, filenames)

    def initialize(self):
        """Load emoji data, compute colors if needed, and build KDTree."""
        self._load_theme_map()

        if os.path.exists(COLORS_FILE):
            self._load_colors_from_json()
        else:
            self._compute_colors()
            self._save_colors_to_json()

        self._build_kdtree()
        print(f"EmojiDatabase initialized with {len(self.filenames)} emojis")

    def _load_theme_map(self):
        """Load the theme categorization map."""
        if os.path.exists(THEME_MAP_FILE):
            with open(THEME_MAP_FILE, "r", encoding="utf-8") as f:
                self.theme_map = json.load(f)

    def _compute_colors(self):
        """Compute average RGB color for each emoji tile."""
        if not os.path.exists(TILES_DIR):
            print(f"Emoji tiles directory not found: {TILES_DIR}")
            print("Generating emoji tiles now...")
            import generate_tiles
            generate_tiles.generate_all_tiles()

        png_files = [f for f in os.listdir(TILES_DIR) if f.endswith(".png")]
        if not png_files:
            raise FileNotFoundError("No PNG files found in emoji_tiles directory.")

        print(f"Computing average colors for {len(png_files)} emoji tiles...")
        for filename in png_files:
            filepath = os.path.join(TILES_DIR, filename)
            try:
                img = Image.open(filepath).convert("RGBA")
                arr = np.array(img)

                # Use only pixels with sufficient opacity
                mask = arr[:, :, 3] > 128
                if mask.any():
                    rgb = arr[:, :, :3][mask]
                    avg_color = rgb.mean(axis=0).tolist()
                else:
                    # Fully transparent - use middle gray
                    avg_color = [128.0, 128.0, 128.0]

                self.emoji_colors[filename] = [round(c, 2) for c in avg_color]
            except Exception as e:
                print(f"  Warning: Could not process {filename}: {e}")

        print(f"  Computed colors for {len(self.emoji_colors)} emojis")

    def _save_colors_to_json(self):
        """Save precomputed colors to JSON file."""
        with open(COLORS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.emoji_colors, f, indent=2)
        print(f"  Saved colors to {COLORS_FILE}")

    def _load_colors_from_json(self):
        """Load precomputed colors from JSON file."""
        with open(COLORS_FILE, "r", encoding="utf-8") as f:
            self.emoji_colors = json.load(f)
        print(f"  Loaded {len(self.emoji_colors)} emoji colors from cache")

    def _build_kdtree(self, filenames=None, colors=None):
        """Build KDTree for fast nearest-neighbor color lookup."""
        if filenames is None:
            self.filenames = list(self.emoji_colors.keys())
            color_array = np.array([self.emoji_colors[f] for f in self.filenames])
        else:
            self.filenames = filenames
            color_array = colors

        if len(self.filenames) == 0:
            raise ValueError("No emoji colors available to build KDTree.")

        self.kdtree = KDTree(color_array)

    def get_themed_tree(self, theme="all"):
        """Get KDTree filtered by theme. Returns (kdtree, filenames)."""
        if theme == "all" or not theme:
            return self.kdtree, self.filenames

        if theme in self._theme_trees:
            return self._theme_trees[theme]

        # Filter emojis by theme
        themed_files = []
        themed_colors = []

        for filename in self.filenames:
            categories = self.theme_map.get(filename, [])
            if theme in categories:
                themed_files.append(filename)
                themed_colors.append(self.emoji_colors[filename])

        # If theme filter yields too few emojis, fall back to all
        if len(themed_files) < 20:
            print(f"  Theme '{theme}' has only {len(themed_files)} emojis, using all emojis")
            return self.kdtree, self.filenames

        color_array = np.array(themed_colors)
        tree = KDTree(color_array)
        self._theme_trees[theme] = (tree, themed_files)
        print(f"  Built themed KDTree for '{theme}' with {len(themed_files)} emojis")
        return tree, themed_files

    def find_closest_emoji(self, rgb_color, theme="all"):
        """Find the emoji tile with the closest average color to the given RGB."""
        tree, filenames = self.get_themed_tree(theme)
        _, idx = tree.query(rgb_color)
        return filenames[idx]

    def find_closest_emojis_batch(self, rgb_colors, theme="all"):
        """
        Vectorized batch lookup of closest emojis for an array of RGB colors.
        rgb_colors: numpy array of shape (N, 3)
        Returns: list of filenames
        """
        tree, filenames = self.get_themed_tree(theme)
        _, indices = tree.query(rgb_colors)
        return [filenames[i] for i in indices]

    def get_emoji_image(self, filename, size=None):
        """Get a cached emoji tile image, optionally resized."""
        cache_key = f"{filename}_{size}" if size else filename

        if cache_key not in self.emoji_images:
            filepath = os.path.join(TILES_DIR, filename)
            img = Image.open(filepath).convert("RGBA")
            if size and (img.width != size or img.height != size):
                img = img.resize((size, size), Image.LANCZOS)
            self.emoji_images[cache_key] = img

        return self.emoji_images[cache_key]

    def clear_cache(self):
        """Clear the image cache to free memory."""
        self.emoji_images.clear()
