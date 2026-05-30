import os
import json

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\26a4860f-7cb4-4f41-b845-d637bac7967c\.system_generated\logs\transcript.jsonl"
out_file = r"c:\Users\user\Desktop\bottle order first try\scratch\extracted_drag_code.js"

found = []
if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if "function initDragAndDrop" in line and "touchmove" in line:
                try:
                    data = json.loads(line)
                    step = data.get("step_index")
                    
                    # Search in tool_calls
                    for tc in data.get("tool_calls", []):
                        args = tc.get("args", {})
                        for k, v in args.items():
                            if isinstance(v, str) and "function initDragAndDrop" in v:
                                if "extract" not in v and "scratch" not in v and "import os" not in v[:100]:
                                    found.append((step, f"tool_call_arg_{k}", v))
                    
                    # Search in content
                    content = data.get("content", "")
                    if "function initDragAndDrop" in content:
                        if "extract" not in content and "scratch" not in content and "import os" not in content[:100] and "File Path:" not in content[:100]:
                            found.append((step, "content", content))
                except Exception as e:
                    pass

    print(f"Found {len(found)} occurrences.")
    for i, (step, type_, val) in enumerate(found):
        print(f"Occurrence {i}: Step {step}, Type {type_}, Length {len(val)}")
        
    if found:
        longest = max(found, key=lambda x: len(x[2]))
        print(f"Writing longest occurrence (Step {longest[0]}, Type {longest[1]}, Length {len(longest[2])}) to {out_file}...")
        with open(out_file, "w", encoding="utf-8") as out:
            out.write(longest[2])
    else:
        print("No occurrences found.")
else:
    print("Transcript not found.")
