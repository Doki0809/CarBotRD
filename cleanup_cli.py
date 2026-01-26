import subprocess
import json

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout

def cleanup():
    # Attempt to list documents via CLI (if it works)
    # Actually, listing via CLI is slow. I'll use the specific IDs I saw in the screenshot.
    
    # IDs from screenshot/logs
    ghost_ids = [
        "DURÃQN FERNÃQNDEZ AUTO S.R.L",
        "DURÃ\x81N FERNÃ\x81NDEZ AUTO S.R.L",
        "DURÃÃQN FERNÃÃQNDEZ AUTO S.R.L"
    ]
    
    for gid in ghost_ids:
        print(f"Cleaning up: {gid}")
        # Use -r to delete subcollections
        cmd = f"npx firebase-tools firestore:delete \"Dealers/{gid}\" --project carbot-5d709 -r -f"
        subprocess.run(cmd, shell=True)

if __name__ == "__main__":
    cleanup()
