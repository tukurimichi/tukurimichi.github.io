#!/usr/bin/env python3
"""
tukurimichi-deploy-tool

GitHubリポジトリへファイルをコミットする汎用CLIツール。
GitHubのウェブ編集画面をキーボード操作でハックする(Ctrl+A→Delete→貼り付け→diff確認)
という力技をやめて、GitHub Contents APIを直接叩いて1コマンドでデプロイする。

対象リポジトリ・ブランチ・トークンの場所は環境変数で指定する(未指定時はデフォルト値を使用):
    DEPLOY_REPO         例: your-name/your-repo.github.io  (デフォルト: tukurimichi/tukurimichi.github.io)
    DEPLOY_BRANCH       例: main                            (デフォルト: main)
    DEPLOY_TOKEN_PATH   例: ~/.your_project/token.txt        (デフォルト: ~/.tukurimichi_deploy/token.txt)

使い方:
    python deploy_to_github.py <ローカルファイル> [リポジトリ内のパス] [コミットメッセージ] [--dry-run]

例:
    python deploy_to_github.py index.html
    python deploy_to_github.py C:\\path\\to\\diary.html diary.html "Update diary"
    python deploy_to_github.py mascot_hero.jpg mascot_hero.jpg "Add hero image"
    python deploy_to_github.py index.html index.html "Update" --dry-run   # 実際にはpushしない

トークンはこのスクリプトとは別の、バージョン管理・クラウド同期の対象外にした
ローカルファイル(デフォルト: %USERPROFILE%\\.tukurimichi_deploy\\token.txt)から読み込む。
このスクリプト自体にトークンを書かないこと。
"""

import argparse
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

REPO = os.environ.get("DEPLOY_REPO", "tukurimichi/tukurimichi.github.io")
BRANCH = os.environ.get("DEPLOY_BRANCH", "main")
TOKEN_PATH = os.path.expanduser(os.environ.get("DEPLOY_TOKEN_PATH", "~/.tukurimichi_deploy/token.txt"))
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


def get_existing(repo_path, token):
    """既存ファイルのsha/contentを返す。無ければ (None, None)。"""
    status, payload = api_request("GET", f"{API_BASE}/{repo_path}?ref={BRANCH}", token)
    if status == 200:
        return payload.get("sha"), payload.get("content", "")
    return None, None


def deploy(local_path, repo_path, message, dry_run=False):
    if not os.path.exists(local_path):
        sys.exit(f"ローカルファイルが見つかりません: {local_path}")

    token = load_token()

    with open(local_path, "rb") as f:
        raw = f.read()
    content_b64 = base64.b64encode(raw).decode("ascii")

    sha, existing_b64 = get_existing(repo_path, token)
    is_update = sha is not None

    if dry_run:
        action = "更新" if is_update else "新規作成"
        print(f"[DRY RUN] {REPO} ({BRANCH}) の {repo_path} を{action}予定")
        print(f"[DRY RUN] ローカルサイズ: {len(raw)} bytes")
        if is_update:
            existing_norm = (existing_b64 or "").replace("\n", "")
            same = existing_norm == content_b64
            print(f"[DRY RUN] 既存内容と{'同一(変更なし)' if same else '差分あり'}")
        print(f"[DRY RUN] commit message: {message}")
        print("[DRY RUN] 実際にpushするには --dry-run を外して再実行してください")
        return

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


def build_parser():
    parser = argparse.ArgumentParser(
        description="tukurimichi-deploy-tool: GitHub Contents API経由でファイルをコミットする",
    )
    parser.add_argument("local_path", help="アップロードするローカルファイル")
    parser.add_argument("repo_path", nargs="?", default=None, help="リポジトリ内の配置先パス(省略時はファイル名)")
    parser.add_argument("message", nargs="?", default=None, help="コミットメッセージ(省略時は自動生成)")
    parser.add_argument("--dry-run", action="store_true", help="実際にはpushせず、変更予定だけ表示する")
    return parser


def main():
    args = build_parser().parse_args()

    repo_path = args.repo_path or os.path.basename(args.local_path)
    message = args.message or f"Update {repo_path} via deploy tool"

    deploy(args.local_path, repo_path, message, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
