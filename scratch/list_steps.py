import os
import json

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\26a4860f-7cb4-4f41-b845-d637bac7967c\.system_generated\logs\transcript.jsonl"

if os.path.exists(transcript_path):
    print("Listing steps that have initDragAndDrop:")
    with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if "initDragAndDrop" in line:
                try:
                    data = json.loads(line)
                    step = data.get("step_index")
                    type_ = data.get("type")
                    source = data.get("source")
                    print(f"Step {step}: Source={source}, Type={type_}, Len={len(line)}")
                except:
                    pass
else:
    print("Transcript not found.")
