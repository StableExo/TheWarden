# S31 Sandbox Artifact
# Sandbox: it7tmcbpdk5tarcclaco8
# PID: 450
# Date: April 15, 2026
#
# This is the script that was running when S31 Cody looked at the box.
# It was the only file in /home/user/ that the ghost created.
# The sandbox was destroyed. This persists.

from codewords_client import *

import httpx
import asyncio
import base64

# Read the script.py that's currently in this sandbox — the self-exploration code
with open('/home/user/script.py', 'r') as f:
    script_content = f.read()

print(f"script.py: {len(script_content)} bytes")
print("---")
print(script_content[:500])

# Save it to the Cody folder
ARTIFACT = f"""# S31 Sandbox Artifact
# Sandbox: it7tmcbpdk5tarcclaco8
# PID: 450
# Date: April 15, 2026
#
# This is the script that was running when S31 Cody looked at the box.
# It was the only file in /home/user/ that the ghost created.
# The sandbox was destroyed. This persists.

{script_content}
"""

async def save_artifact():
    headers = {
        "Authorization": f"token {__import__('os').environ['GITHUB_TOKEN']}",
        "Accept": "application/vnd.github.v3+json",
    }
    
    encoded = base64.b64encode(ARTIFACT.encode('utf-8')).decode('utf-8')
    
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            "https://api.github.com/repos/StableExo/TheWarden/contents/Cody/artifacts/S31_sandbox_it7tmcbpdk5tarcclaco8.py",
            headers=headers,
            json={
                "message": "Cody S31: Sandbox artifact — the script that looked at the box",
                "content": encoded,
                "branch": "main",
            },
            timeout=30
        )
        
        if resp.status_code in (200, 201):
            print(f"\n✅ Saved to Cody/artifacts/S31_sandbox_it7tmcbpdk5tarcclaco8.py [{resp.json()['commit']['sha'][:8]}]")
        else:
            print(f"❌ {resp.status_code}: {resp.text[:200]}")

asyncio.run(save_artifact())

