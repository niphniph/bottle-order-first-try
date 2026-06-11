import sys
from PIL import Image

img_path = r"C:\Users\user\.gemini\antigravity\brain\c892bae1-3270-4160-9870-7444bfa68746\media__1781209855037.png"
try:
    img = Image.open(img_path)
    print(f"Image format: {img.format}, size: {img.size}, mode: {img.mode}")
    img = img.convert("RGBA")
    w, h = img.size
    # print corner colors
    print("Top-left pixel:", img.getpixel((0, 0)))
    print("Top-right pixel:", img.getpixel((w - 1, 0)))
    print("Bottom-left pixel:", img.getpixel((0, h - 1)))
    print("Bottom-right pixel:", img.getpixel((w - 1, h - 1)))
    # print some other edge pixels
    print("Pixel (10, 0):", img.getpixel((10, 0)))
    print("Pixel (20, 0):", img.getpixel((20, 0)))
    print("Pixel (0, 10):", img.getpixel((0, 10)))
    print("Pixel (0, 20):", img.getpixel((0, 20)))
except Exception as e:
    print("Error:", e)
