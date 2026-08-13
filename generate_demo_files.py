#!/usr/bin/env python3
"""
anitag デモ用アニメ動画ファイル生成スクリプト
メジャーなファイル名パターン（字幕組, S01E01, 日本語話数, v2表記など）のダミーファイルを生成します。
"""
import sys
from pathlib import Path

DEFAULT_OUTPUT_DIR = "./demo_anime_files"

DEMO_PATTERNS = [
    # 1. 海外字幕組 / Fansub スタイル
    "[HorribleSubs] Sousou no Frieren - 01 [1080p].mkv",
    "[Erai-raws] Sousou no Frieren - 02 [1080p][Multiple Subtitle].mkv",
    "[SubsPlease] Sousou no Frieren - 03 (1080p) [A1B2C3D4].mkv",
    "[SubGroup] Sousou no Frieren - 04v2 [1080p].mp4",
    "[SubGroup] Sousou no Frieren - 05 [1080p].mkv",

    # 2. Season & Episode スタイル (S01E01)
    "Dungeon_Meshi_S01E01_1080p_WEB-DL.mkv",
    "Dungeon_Meshi_S01E02_1080p.mkv",
    "Dungeon_Meshi_S01E03v2_1080p.mkv",
    "Dungeon_Meshi_S01E04_1080p.mp4",

    # 3. 日本語話数表記
    "葬送のフリーレン 第01話 「冒険の終わり」.ts",
    "葬送のフリーレン 第02話.ts",
    "葬送のフリーレン 第03v2話 「蒼月草」.mp4",
    "ダンジョン飯 第14話.mkv",

    # 4. カッコ・記号表記 (#01, EP01, [01])
    "Anime Name #01 (BD 1080p).mkv",
    "Anime Name #02 (BD 1080p).mkv",
    "Anime_Name_EP03_x265.mkv",
    "Title [04v2] [1080p].mp4",

    # 5. 通算話数・ハイフン区切り
    "One Piece - 1085 [1080p].mp4",
    "One Piece - 1086 [1080p].mp4",
]

def main():
    target_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(DEFAULT_OUTPUT_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"デモ用ダミーファイルを生成中: {target_dir.resolve()}")
    
    count = 0
    for filename in DEMO_PATTERNS:
        file_path = target_dir / filename
        file_path.touch(exist_ok=True)
        count += 1
        print(f"  └─ 作成: {filename}")

    print(f"\n生成完了: 計 {count} 件のダミーファイルを作成しました")
    print(f"anitag で {target_dir.resolve()} を選択してテストできます")

if __name__ == "__main__":
    main()
