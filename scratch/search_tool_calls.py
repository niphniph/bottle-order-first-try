import json
import os

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\70648967-02e5-4eca-b4a4-cbdc882b59b6\.system_generated\logs\transcript.jsonl"

if os.path.exists(transcript_path):
    print("Searching for index.html references in tool execution:")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                type_ = data.get("type")
                tool_calls = data.get("tool_calls")
                content = data.get("content", "")
                
                # Check if this is a tool call to view_file targeting index.html
                if tool_calls:
                    for tc in tool_calls:
                        args = tc.get("args", {})
                        path = args.get("AbsolutePath", "")
                        if "index.html" in path:
                            print(f"Tool Call: Step {step}, Name={tc.get('name')}, Path={path}")
                            
                # Check if this is the response to a view_file targeting index.html
                if type_ == "VIEW_FILE" and len(content) > 2000:
                    # Let's see if the word index.html is in content preview
                    if "index.html" in content[:300] or "DOCTYPE" in content[:300]:
                        print(f"Tool Response: Step {step}, Type={type_}, Content Length={len(content)}, Preview={content[:150].replace(chr(10), ' ')}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
