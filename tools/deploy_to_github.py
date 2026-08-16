#!/usr/bin/env python3
"""
tukurimichi-deploy-tool

tukurimichi.github.io リポジトリへファイルをコミットする専用CLIツール。
GitHubのウェブ編集画面をキーボード操作でハックする(Ctrl+A→Delete→貼り付け→diff確認)
という力技をやめて、GitHub Contents APIを直接叩いて1コマンドでデプロイする。

使い方:
    python deploy_to_github.py <ローカルファイル> [リポジトリ内のパス] [コミットメッセージ]

例:
    python deploy_to_github.py index.html
    python deploy_to_github.py C:\\path\\to\\diary.html diary.html "Update diary"
    python deploy_to_github.py mascot_hero.jpg mascot_hero.jpg "Add hero image"

トークンは G:\\マイドライブ\\00Claude\\つくるみち\\tools とは別の、
Google Drive同期対象外のローカルファイル(%USERPROFILE%\\.tukurimichi_deploy\\token.txt)
から読み込む。このスクリプト自体にトークンを書かないこと。
"""

import base64
import io
import json
import os
import sys
import urllib.request
import urllib.error

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

REPO = "tukurimichi/tukurimichi.github.io"
BRANCH = "main"
TOKEN_PATH = os.path.expanduser("~/.tukurimichi_deploy/token.txt")
API_BASE = f"https://api.github.com/repos/{REPO}/contents"


def load_token():
    if not os.path.exists(TOKEN_PATH):
        sys.exit(f"トークンファイルが見つかりません: {TOKEN_PATH}")
    with open(TOKEN_PATH, "r", encoding="utf-8") as f:
        return f.read().strip()


def api_request(method, url, token, body=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "tukurimichi-deploy-tool",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def get_existing_sha(repo_path, token):
    status, payload = api_request("GET", f"{API_BASE}/{repo_path}?ref={BRANCH}", token)
    if status == 200:
        return payload.get("sha")
    return None


def deploy(local_path, repo_path, message):
    if not os.path.exists(local_path):
        sys.exit(f"ローカルファイルが見つかりません: {local_path}")

    token = load_token()

    with open(local_path, "rb") as f:
        content_b64 = base64.b64encode(f.read()).decode("ascii")

    sha = get_existing_sha(repo_path, token)
    is_update = sha is not None

    body = {
        "message": message,
        "content": content_b64,
        "branch": BRANCH,
    }
    if sha:
        body["sha"] = sha

    status, payload = api_request("PUT", f"{API_BASE}/{repo_path}", token, body)

    if status in (200, 201):
        commit = payload.get("commit", {})
        action = "更新" if is_update else "新規作成"
        print(f"OK: {repo_path} を{action}しました")
        print(f"  commit: {commit.get('sha', '?')[:7]}  {commit.get('html_url', '')}")
        print(f"  live: https://tukurimichi.com/{repo_path}")
    else:
        print(f"NG (HTTP {status}): {payload.get('message', payload)}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    local_path = sys.argv[1]
    repo_path = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(local_path)
    message = sys.argv[3] if len(sys.argv) > 3 else f"Update {repo_path} via deploy tool"

    deploy(local_path, repo_path, message)


if __name__ == "__main__":
    main()
