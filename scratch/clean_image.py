import sys
from PIL import Image
from collections import deque

img_path = r"C:\Users\user\.gemini\antigravity\brain\c892bae1-3270-4160-9870-7444bfa68746\media__1781209855037.png"
output_path = r"c:\Users\user\Desktop\bottle order first try\public\skins\skin14.png"

try:
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Visited matrix
    visited = [[False] * h for _ in range(w)]
    queue = deque()

    # Define near white / light gray background checkerboard check
    def is_background_color(r, g, b, a):
        # Checkerboard squares are white (255, 255, 255) or light gray (~238, 239, 239)
        # Any pixel where r, g, b are all > 200 is part of the checkerboard
        return a > 0 and r > 200 and g > 200 and b > 200

    # Add border pixels to the queue
    for x in range(w):
        if is_background_color(*pixels[x, 0]):
            queue.append((x, 0))
            visited[x][0] = True
        if is_background_color(*pixels[x, h - 1]):
            queue.append((x, h - 1))
            visited[x][h - 1] = True

    for y in range(h):
        if is_background_color(*pixels[0, y]):
            queue.append((0, y))
            visited[0][y] = True
        if is_background_color(*pixels[w - 1, y]):
            queue.append((w - 1, y))
            visited[w - 1][y] = True

    # Flood fill
    while queue:
        x, y = queue.popleft()
        
        # Make transparent
        r, g, b, a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

        # Check neighbors (8-connectivity)
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                if not visited[nx][ny]:
                    nr, ng, nb, na = pixels[nx, ny]
                    if is_background_color(nr, ng, nb, na):
                        visited[nx][ny] = True
                        queue.append((nx, ny))

    # Optional: clean any remaining isolated near-white fringe pixels that touch transparency
    # but not flood-filled (e.g. anti-aliased edge pixels at the boundary of the bottle)
    # We do a second pass
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = pixels[x, y]
            if a > 0 and r > 210 and g > 210 and b > 210:
                # Check if it has a transparent neighbor
                has_transparent_neighbor = False
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    if pixels[x + dx, y + dy][3] == 0:
                        has_transparent_neighbor = True
                        break
                if has_transparent_neighbor:
                    pixels[x, y] = (r, g, b, 0)

    # Save to output path
    img.save(output_path, "PNG")
    print("Successfully processed and saved to", output_path)

except Exception as e:
    print("Error:", e)
