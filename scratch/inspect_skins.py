import os
from PIL import Image
from collections import Counter

skins = ['skin6', 'skin11', 'skin12', 'skin13']
skins_dir = r'c:\Users\user\Desktop\bottle order first try\public\skins'

for skin in skins:
    path = os.path.join(skins_dir, f'{skin}.png')
    if not os.path.exists(path):
        print(f'{skin}.png not found at {path}')
        continue
    
    img = Image.open(path).convert('RGBA')
    width, height = img.size
    
    # Extract non-transparent pixels
    visible_pixels = []
    r_sum, g_sum, b_sum = 0, 0, 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            if a > 15: # Opaque enough
                visible_pixels.append((r, g, b))
                r_sum += r
                g_sum += g
                b_sum += b
                
    print(f'=== {skin} ===')
    print(f'Dimensions: {width}x{height}')
    total_visible = len(visible_pixels)
    if total_visible == 0:
        print('No visible pixels found!')
        continue
        
    avg_r = r_sum / total_visible
    avg_g = g_sum / total_visible
    avg_b = b_sum / total_visible
    print(f'Average RGB (Opaque): R={avg_r:.1f}, G={avg_g:.1f}, B={avg_b:.1f}')
    
    # Quantize colors slightly to find dominant shades (e.g. divide by 16)
    quantized_colors = []
    for r, g, b in visible_pixels:
        qr = (r // 16) * 16
        qg = (g // 16) * 16
        qb = (b // 16) * 16
        quantized_colors.append((qr, qg, qb))
        
    counter = Counter(quantized_colors)
    most_common = counter.most_common(5)
    print('Most common quantized colors:')
    for (qr, qg, qb), count in most_common:
        hex_color = f'#{qr:02x}{qg:02x}{qb:02x}'
        print(f'  {hex_color} (approx RGB: {qr},{qg},{qb}): {count} pixels ({count/total_visible*100:.1f}%)')
