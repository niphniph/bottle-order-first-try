import json
import os

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\70648967-02e5-4eca-b4a4-cbdc882b59b6\.system_generated\logs\transcript.jsonl"

if os.path.exists(transcript_path):
    print("Listing index.html references in transcript:")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                source = data.get("source")
                type_ = data.get("type")
                content = data.get("content", "")
                tool_calls = data.get("tool_calls", [])
                
                # Check if "index.html" is in line
                if "index.html" in line:
                    tc_names = [tc.get("name") for tc in tool_calls]
                    print(f"Step {step}: Source={source}, Type={type_}, Tools={tc_names}, ContentLen={len(content)}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
