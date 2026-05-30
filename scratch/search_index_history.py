import json
import os

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\70648967-02e5-4eca-b4a4-cbdc882b59b6\.system_generated\logs\transcript.jsonl"

if os.path.exists(transcript_path):
    print("Searching for full index.html views in log history:")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                type_ = data.get("type")
                content = data.get("content", "")
                
                if "index.html" in line and type_ == "VIEW_FILE" and len(content) > 5000:
                    print(f"Step {step}: Type={type_}, Content Length={len(content)}, Preview={content[:120].replace(chr(10), ' ')}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
