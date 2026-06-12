import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    "https://nine13.site/bottleorder/",
    "https://nine13.site/bottleorder",
    "https://nine13.site/tracker/bottleorder/",
    "https://gonze.pages.dev/bottleorder/",
    "https://gonze.pages.dev/bottleorder",
    "https://gonze.pages.dev/tracker/bottleorder/"
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            print(f"{url} -> {response.status}")
    except Exception as e:
        print(f"{url} -> Error: {e}")
