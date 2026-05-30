import os

scratch_dir = r"c:\Users\user\Desktop\bottle order first try\scratch"

for f in os.listdir(scratch_dir):
    if f.startswith("step_"):
        path = os.path.join(scratch_dir, f)
        try:
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()
                if "touchmove" in content or "pointerdown" in content or "drag" in content or "pointermove" in content:
                    print(f"File {f} matches! Length: {len(content)}")
                    # print first 500 characters of the match
                    idx = content.lower().find("drag")
                    if idx != -1:
                        print(content[max(0, idx-50):idx+500])
                    print("=" * 60)
        except Exception as e:
            pass
