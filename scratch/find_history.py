import json
import os

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\70648967-02e5-4eca-b4a4-cbdc882b59b6\.system_generated\logs\transcript.jsonl"
output_dir = r"c:\Users\user\Desktop\bottle order first try\scratch"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

if os.path.exists(transcript_path):
    print("Found transcript.jsonl. Reading...")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                type_ = data.get("type")
                content = data.get("content")
                
                # Check for style.css viewing in early steps
                if type_ == "VIEW_FILE" and "style.css" in line and content and len(content) > 1000:
                    out_path = os.path.join(output_dir, f"backup_style_step_{step}.css")
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        # Strip line numbers if present
                        lines = content.split('\n')
                        cleaned_lines = []
                        for l in lines:
                            if ':' in l:
                                parts = l.split(':', 1)
                                # check if the part before colon is a line number
                                if parts[0].strip().isdigit():
                                    cleaned_lines.append(parts[1])
                                else:
                                    cleaned_lines.append(l)
                            else:
                                cleaned_lines.append(l)
                        out_f.write('\n'.join(cleaned_lines))
                    print(f"Extracted style.css backup from step {step} to {out_path}")
                    
                # Check for index.html viewing in early steps
                if type_ == "VIEW_FILE" and "index.html" in line and content and len(content) > 10000:
                    out_path = os.path.join(output_dir, f"backup_index_step_{step}.html")
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        lines = content.split('\n')
                        cleaned_lines = []
                        for l in lines:
                            if ':' in l:
                                parts = l.split(':', 1)
                                if parts[0].strip().isdigit():
                                    cleaned_lines.append(parts[1])
                                else:
                                    cleaned_lines.append(l)
                            else:
                                cleaned_lines.append(l)
                        out_f.write('\n'.join(cleaned_lines))
                    print(f"Extracted index.html backup from step {step} to {out_path}")
            except Exception as e:
                pass
else:
    print("Transcript not found.")
