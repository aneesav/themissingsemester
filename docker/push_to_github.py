#!/usr/bin/env python3
"""
Push multiple docker/ files to GitHub in a single commit using the Git Trees API.
Usage: python3 push_to_github.py "commit message"
"""
import urllib.request, urllib.error, json, os, base64, sys

TOKEN = os.environ["GITHUB_PERSONAL_ACCESS_TOKEN"]
REPO  = "aneesav/themissingsemester"
BASE  = os.path.dirname(os.path.abspath(__file__))

FILES = [
    "Dockerfile",
    "bootstrap.sh",
    "requirements-core.txt",
    "requirements-bio.txt",
    "requirements-spatial.txt",
    "requirements-ai.txt",
]

def gh(method, path, data=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}{path}",
        data=json.dumps(data).encode() if data else None,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def push(message):
    # 1. Get HEAD commit SHA and tree SHA
    _, ref = gh("GET", "/git/ref/heads/main")
    head_sha = ref["object"]["sha"]
    _, commit = gh("GET", f"/git/commits/{head_sha}")
    base_tree = commit["tree"]["sha"]
    print(f"HEAD: {head_sha[:8]}  tree: {base_tree[:8]}")

    # 2. Create blobs for each file
    tree_items = []
    for fname in FILES:
        local = os.path.join(BASE, fname)
        if not os.path.exists(local):
            print(f"  skip (not found): {fname}")
            continue
        content = open(local, "rb").read()
        _, blob = gh("POST", "/git/blobs", {
            "content": base64.b64encode(content).decode(),
            "encoding": "base64",
        })
        tree_items.append({
            "path": f"docker/{fname}",
            "mode": "100755" if fname.endswith(".sh") else "100644",
            "type": "blob",
            "sha": blob["sha"],
        })
        print(f"  blob: docker/{fname} → {blob['sha'][:8]}")

    # 3. Create new tree
    _, tree = gh("POST", "/git/trees", {"base_tree": base_tree, "tree": tree_items})
    print(f"  new tree: {tree['sha'][:8]}")

    # 4. Create commit
    _, new_commit = gh("POST", "/git/commits", {
        "message": message,
        "tree": tree["sha"],
        "parents": [head_sha],
    })
    print(f"  commit: {new_commit['sha'][:8]}")

    # 5. Update branch ref
    status, _ = gh("PATCH", "/git/refs/heads/main", {
        "sha": new_commit["sha"],
        "force": False,
    })
    print(f"  ref update: {status}")
    print(f"Done → https://github.com/{REPO}/commit/{new_commit['sha'][:8]}")

if __name__ == "__main__":
    msg = sys.argv[1] if len(sys.argv) > 1 else "Update docker build files"
    push(msg)
