#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sitemap.xml を作り直す。

    python tools/build_sitemap.py            # sitemap.xml を書き出す
    python tools/build_sitemap.py --dry-run  # 中身を表示するだけ

やること:
  - リポジトリ(正本)のツリーを GitHub API から取得して .html を全部拾う
  - index.html はディレクトリ形式のURLにする (apps/pdf/index.html -> /apps/pdf/)
  - EXCLUDE に入れたものは出さない
  - <lastmod> は、そのファイルの最後のコミット日を GitHub API から取る
    (取れなかったものは lastmod なしで出す。日付をでっち上げない)

ページを増やしたら、これを走らせて sitemap.xml を push すること。
トークンは deploy_to_github.py と同じ ~/.tukurimichi_deploy/token.txt を使う。
無くても動くが、その場合 API のレート制限に当たりやすい。
"""
import json
import os
import sys
import io
import time
import urllib.parse
import urllib.request
import urllib.error
from xml.sax.saxutils import escape

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.environ.get("DEPLOY_REPO", "tukurimichi/tukurimichi.github.io")
BRANCH = os.environ.get("DEPLOY_BRANCH", "main")
TOKEN_PATH = os.path.expanduser(
    os.environ.get("DEPLOY_TOKEN_PATH", "~/.tukurimichi_deploy/token.txt"))
SITE = "https://tukurimichi.com/"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "sitemap.xml")

# 検索結果に出したくないページ
EXCLUDE = {
    "404.html",             # エラーページ
    "mascot3d/index.html",  # mascot3d.html に iframe で埋め込む用。単体で載せると内容が重複する
}

# トップに近いものほど大きい値。書いていないページは 0.6
PRIORITY = {
    "": "1.0",
    "made.html": "0.8",
    "play.html": "0.8",
    "story.html": "0.8",
    "tools.html": "0.8",
    "diary.html": "0.7",
    "changelog.html": "0.4",
    "credit.html": "0.4",
}


def load_token():
    try:
        with open(TOKEN_PATH, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return None


def api(url, token, tries=4):
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "tukurimichi-sitemap-tool",
    }
    if token:
        headers["Authorization"] = "Bearer " + token
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # 一時的な切断・レート制限は少し待って再試行
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def to_url(path):
    """リポジトリ内パス -> 公開URLのパス"""
    if path == "index.html":
        return ""
    if path.endswith("/index.html"):
        return path[: -len("index.html")]
    return path


def main():
    dry = "--dry-run" in sys.argv
    token = load_token()
    if not token:
        print("※ トークンが読めなかったので未認証で取得します(レート制限に注意)")

    tree = api("https://api.github.com/repos/%s/git/trees/%s?recursive=1" % (REPO, BRANCH), token)
    if tree.get("truncated"):
        sys.exit("ツリーが truncated で返ってきました。取得方法を見直してください")

    pages = sorted(
        x["path"] for x in tree["tree"]
        if x["type"] == "blob" and x["path"].endswith(".html") and x["path"] not in EXCLUDE
    )
    print("対象 %d ページ (除外 %d)" % (len(pages), len(EXCLUDE)))

    entries = []
    for i, p in enumerate(pages, 1):
        url = to_url(p)
        lastmod = None
        try:
            commits = api(
                "https://api.github.com/repos/%s/commits?%s" % (
                    REPO, urllib.parse.urlencode({"path": p, "per_page": 1, "sha": BRANCH})),
                token)
            if commits:
                lastmod = commits[0]["commit"]["committer"]["date"][:10]
        except Exception as e:
            print("  ! %s の最終更新日が取れませんでした (%s)" % (p, e))
        entries.append((url, lastmod, PRIORITY.get(url, "0.6")))
        print("  [%2d/%d] %-28s %s" % (i, len(pages), url or "(トップ)", lastmod or "lastmod無し"))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod, pri in entries:
        lines.append("  <url>")
        lines.append("    <loc>%s</loc>" % escape(SITE + url))
        if lastmod:
            lines.append("    <lastmod>%s</lastmod>" % lastmod)
        lines.append("    <priority>%s</priority>" % pri)
        lines.append("  </url>")
    lines.append("</urlset>")
    xml = "\n".join(lines) + "\n"

    if dry:
        print("\n" + xml)
        print("[DRY RUN] 書き出していません")
        return
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(xml)
    print("\n書き出しました: %s (%d bytes)" % (OUT, len(xml.encode("utf-8"))))
    print("このあと sitemap.xml を push すること。")


if __name__ == "__main__":
    main()
