import os
from PIL import Image

skins = ['skin6', 'skin11', 'skin12', 'skin13']
skins_dir = r'c:\Users\user\Desktop\bottle order first try\public\skins'

for skin in skins:
    path = os.path.join(skins_dir, f'{skin}.png')
    if not os.path.exists(path):
        continue
        
    img = Image.open(path).convert('RGBA')
    width, height = img.size
    
    # Find bounding box of non-transparent pixels
    left, top, right, bottom = width, height, 0, 0
    for y in range(height):
        for x in range(width):
            _, _, _, a = img.getpixel((x, y))
            if a > 30:
                if x < left: left = x
                if x > right: right = x
                if y < top: top = y
                if y > bottom: bottom = y
                
    bbox_w = right - left
    bbox_h = bottom - top
    
    # Analyze 3 horizontal segments (Top, Middle, Bottom) of the bounding box
    seg_h = bbox_h // 3
    segments = ['Top', 'Middle', 'Bottom']
    
    seg_colors = []
    for i, seg in enumerate(segments):
        s_top = top + i * seg_h
        s_bot = top + (i + 1) * seg_h if i < 2 else bottom
        
        r_sum, g_sum, b_sum, count = 0, 0, 0, 0
        for y in range(s_top, s_bot):
            for x in range(left, right):
                r, g, b, a = img.getpixel((x, y))
                if a > 30:
                    r_sum += r
                    g_sum += g
                    b_sum += b
                    count += 1
        if count > 0:
            seg_colors.append((r_sum/count, g_sum/count, b_sum/count))
        else:
            seg_colors.append((0,0,0))
            
    print(f'=== {skin} BBox: {left},{top} to {right},{bottom} (Width: {bbox_w}, Height: {bbox_h}) ===')
    for i, seg in enumerate(segments):
        r, g, b = seg_colors[i]
        print(f'  {seg} Section Average Color: R={r:.1f}, G={g:.1f}, B={b:.1f}')
        
    # Let's generate a tiny 10x20 ASCII art representation
    # using a simple scale of opacity/brightness to show the shape
    ascii_w = 16
    ascii_h = 24
    dx = bbox_w / ascii_w
    dy = bbox_h / ascii_h
    
    print('  Shape Outline:')
    for ay in range(ascii_h):
        line = '  '
        for ax in range(ascii_w):
            px = int(left + ax * dx)
            py = int(top + ay * dy)
            if px < width and py < height:
                r, g, b, a = img.getpixel((px, py))
                if a < 20:
                    line += ' '
                elif a < 128:
                    line += '.'
                else:
                    # Let's print a character representing color tone
                    # If R is highest: 'R', G highest: 'G', B highest: 'B'
                    if r > g + 15 and r > b + 15:
                        line += 'R'
                    elif g > r + 15 and g > b + 15:
                        line += 'G'
                    elif b > r + 15 and b > g + 15:
                        line += 'B'
                    elif abs(r - g) < 15 and abs(g - b) < 15 and r > 180:
                        line += '#' # White/light
                    else:
                        line += '*' # Neutral/dark
            else:
                line += ' '
        print(line)
    print()
