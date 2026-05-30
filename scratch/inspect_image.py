import os
from PIL import Image

image_path = r"c:\Users\user\Desktop\bottle order first try\public\skins\skin1.png"
if os.path.exists(image_path):
    try:
        img = Image.open(image_path)
        print("Format:", img.format)
        print("Mode:", img.mode)
        print("Size:", img.size)
        
        # Check if alpha channel exists
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            alpha = img.convert('RGBA').split()[-1]
            bbox = alpha.getbbox()
            print("Alpha bounding box:", bbox)
            
            # Count completely opaque, semi-transparent, and transparent pixels
            data = alpha.getdata()
            opaque = sum(1 for p in data if p == 255)
            transparent = sum(1 for p in data if p == 0)
            semi = len(data) - opaque - transparent
            print(f"Pixels - Opaque: {opaque}, Transparent: {transparent}, Semi-transparent: {semi}")
        else:
            print("No alpha channel present in image!")
    except Exception as e:
        print("Error opening image:", e)
else:
    print("File not found:", image_path)
