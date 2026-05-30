import os
import json

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\26a4860f-7cb4-4f41-b845-d637bac7967c\.system_generated\logs\transcript.jsonl"
out_p = r"c:\Users\user\Desktop\bottle order first try\scratch\extracted_drag_events.txt"

found = []
if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if "touchstart" in line or "pointerdown" in line or "mousedown" in line:
                try:
                    data = json.loads(line)
                    step = data.get("step_index")
                    type_ = data.get("type")
                    
                    # Search tool calls
                    for tc in data.get("tool_calls", []):
                        args = tc.get("args", {})
                        for k, v in args.items():
                            if isinstance(v, str) and ("touchstart" in v or "pointerdown" in v) and "function" in v:
                                if "extract" not in v and "scratch" not in v:
                                    found.append((step, f"tool_call_arg_{k}", v))
                                    
                    # Search content
                    content = data.get("content", "")
                    if "touchstart" in content or "pointerdown" in content:
                        if "extract" not in content and "scratch" not in content and "File Path:" not in content[:100] and "import os" not in content[:100]:
                            found.append((step, "content", content))
                except Exception as e:
                    pass

    print(f"Found {len(found)} drag-event-related step logs.")
    for i, (step, type_, val) in enumerate(found):
        print(f"Match {i}: Step {step}, Type {type_}, Len={len(val)}")
        
    if found:
        longest = max(found, key=lambda x: len(x[2]))
        print(f"Saving longest match from step {longest[0]} ({longest[1]}) to {out_p}...")
        with open(out_p, "w", encoding="utf-8") as out:
            out.write(longest[2])
    else:
        print("No drag events found.")
else:
    print("Transcript not found.")
