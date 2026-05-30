import os
import json

base_dir = r"C:\Users\user\.gemini\antigravity\brain\26a4860f-7cb4-4f41-b845-d637bac7967c"

found_any = False
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith(".jsonl") or f.endswith(".log") or f.endswith(".html") or f.endswith(".js"):
            path = os.path.join(root, f)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as file:
                    content = file.read()
                    if "initDragAndDrop" in content and "touchmove" in content:
                        print(f"FOUND in: {path}")
                        found_any = True
                        # print first occurrence
                        idx = content.find("function initDragAndDrop")
                        if idx != -1:
                            print(content[idx:idx+2000])
                            print("=" * 60)
            except Exception as e:
                pass

if not found_any:
    print("Could not find any historical occurrences of initDragAndDrop with touchmove.")
