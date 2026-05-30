import json
import os

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\70648967-02e5-4eca-b4a4-cbdc882b59b6\.system_generated\logs\transcript.jsonl"

if os.path.exists(transcript_path):
    print("Searching for initDragAndDrop in transcript:")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                tool_calls = data.get("tool_calls", [])
                
                # Check tool calls first
                for tc in tool_calls:
                    args = tc.get("args", {})
                    content = args.get("ReplacementContent", "") or args.get("CodeContent", "")
                    if "initDragAndDrop" in content and "touchmove" in content:
                        print(f"FOUND IN TOOL CALL step {step}:")
                        print(content[:1500])
                        print("-" * 50)
                
                # Check view file or other outputs
                content = data.get("content", "")
                if "initDragAndDrop" in content and "touchmove" in content and len(content) > 1000:
                    idx = content.find("function initDragAndDrop")
                    if idx != -1:
                        print(f"FOUND IN STEP {step} (index {idx}):")
                        print(content[idx:idx+2500])
                        print("-" * 50)
            except Exception as e:
                pass
else:
    print("Transcript not found.")
