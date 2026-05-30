import re

def analyze_file(file_path):
    print("=" * 40)
    print("Analyzing:", file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple regex to extract CSS blocks
    blocks = re.findall(r"([^{]+)\{([^}]+)\}", content)
    for selector, body in blocks:
        selector = selector.strip()
        body = body.strip()
        
        # Check if selector is bottle-related
        if any(term in selector.lower() for term in ["bottle", "liquid", "slot", "skin"]):
            # Check if body contains background, border, or shadow
            if any(prop in body for prop in ["background", "border", "shadow", "outline"]):
                print(f"Selector: {selector}")
                print(f"Rules:\n{body}")
                print("-" * 20)

analyze_file(r"c:\Users\user\Desktop\bottle order first try\style.css")
analyze_file(r"c:\Users\user\Desktop\bottle order first try\index.html")
