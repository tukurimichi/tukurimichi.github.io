# -*- coding: utf-8 -*-
"""動画を等間隔で切り出して画像にする（中身をClaudeが見られるようにするための道具）

使い方:
    python tools/video_frames.py <動画ファイル> [枚数] [出力フォルダ]

    枚数を省略すると5枚。出力フォルダを省略すると、動画と同じ場所の
    「frames/<動画名>/」に 01.jpg 〜 のように保存する。

    例:
        python tools/video_frames.py 動画/ASMR/03_石鹸を真っ二つ_火花あり.mp4
        python tools/video_frames.py 動画/ASMR/02_両手でぐしゃぐしゃ.mp4 8

必要なもの: imageio-ffmpeg（`pip install imageio-ffmpeg` で ffmpeg 本体も一緒に入る）
"""
import json
import os
import subprocess
import sys

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FFPROBE = FFMPEG.replace("ffmpeg", "ffprobe")


def duration_of(path):
    """尺（秒）を返す。ffprobeが無い環境でも動くよう ffmpeg の出力から拾う"""
    if os.path.exists(FFPROBE):
        out = subprocess.run(
            [FFPROBE, "-v", "error", "-show_entries", "format=duration",
             "-of", "json", path],
            capture_output=True, text=True)
        try:
            return float(json.loads(out.stdout)["format"]["duration"])
        except Exception:
            pass
    out = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True,
                         encoding="utf-8", errors="ignore")
    for line in out.stderr.splitlines():
        if "Duration:" in line:
            hms = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = hms.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise SystemExit("尺が取れませんでした: " + path)


def grab(path, sec, dest):
    subprocess.run(
        [FFMPEG, "-y", "-ss", "%.3f" % sec, "-i", path,
         "-frames:v", "1", "-q:v", "3", dest],
        capture_output=True)
    return os.path.exists(dest)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)

    src = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    if not os.path.exists(src):
        raise SystemExit("見つかりません: " + src)

    base = os.path.splitext(os.path.basename(src))[0]
    outdir = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
        os.path.dirname(os.path.abspath(src)), "frames", base)
    os.makedirs(outdir, exist_ok=True)

    dur = duration_of(src)
    # 最初と最後は端に寄りすぎると真っ黒になることがあるので、少し内側を取る
    margin = min(0.08, dur * 0.02)
    if n == 1:
        times = [dur / 2]
    else:
        step = (dur - 2 * margin) / (n - 1)
        times = [margin + step * i for i in range(n)]

    print("尺 %.2f秒 → %d枚" % (dur, n))
    made = []
    for i, t in enumerate(times, 1):
        dest = os.path.join(outdir, "%02d_%.1fs.jpg" % (i, t))
        if grab(src, t, dest):
            made.append(dest)
            print("  %s" % dest)
        else:
            print("  失敗: %.2f秒" % t)
    print("%d枚できました: %s" % (len(made), outdir))


if __name__ == "__main__":
    main()
