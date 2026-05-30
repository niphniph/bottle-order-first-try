import os
import json

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\26a4860f-7cb4-4f41-b845-d637bac7967c\.system_generated\logs\transcript.jsonl"

steps_to_extract = [223, 230, 242, 260, 266, 322]

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                if step in steps_to_extract:
                    print(f"=== STEP {step} (Type: {data.get('type')}) ===")
                    # print keys
                    print("Keys:", list(data.keys()))
                    # print tool calls args
                    for tc in data.get("tool_calls", []):
                        args = tc.get("args", {})
                        for k, v in args.items():
                            if isinstance(v, str) and "initDragAndDrop" in v:
                                print(f"Tool arg {k} length: {len(v)}")
                                # save to a separate file in scratch
                                out_p = f"c:\\Users\\user\\Desktop\\bottle order first try\\scratch\\step_{step}_{k}.js"
                                with open(out_p, "w", encoding="utf-8") as out:
                                    out.write(v)
                                print(f"Saved to {out_p}")
                    # print content if relevant
                    content = data.get("content", "")
                    if "initDragAndDrop" in content:
                        print(f"Content length: {len(content)}")
                        out_p = f"c:\\Users\\user\\Desktop\\bottle order first try\\scratch\\step_{step}_content.txt"
                        with open(out_p, "w", encoding="utf-8") as out:
                            out.write(content)
                        print(f"Saved to {out_p}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
