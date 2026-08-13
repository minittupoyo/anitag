#!/usr/bin/env python3
"""
anitag デモ用アニメ動画ファイル生成スクリプト
カテゴリ（形式）を指定してデモファイルを生成できます。
"""
import argparse
import sys
from pathlib import Path

# カテゴリ別のダミーファイル名定義
PATTERNS_BY_CATEGORY = {
    "fansub": [
        "[HorribleSubs] Sousou no Frieren - 01 [1080p].mkv",
        "[Erai-raws] Sousou no Frieren - 02 [1080p][Multiple Subtitle].mkv",
        "[SubsPlease] Sousou no Frieren - 03 (1080p) [A1B2C3D4].mkv",
        "[SubGroup] Sousou no Frieren - 04v2 [1080p].mp4",
        "[SubGroup] Sousou no Frieren - 05 [1080p].mkv",
    ],
    "se": [
        "Dungeon_Meshi_S01E01_1080p_WEB-DL.mkv",
        "Dungeon_Meshi_S01E02_1080p.mkv",
        "Dungeon_Meshi_S01E03v2_1080p.mkv",
        "Dungeon_Meshi_S01E04_1080p.mp4",
    ],
    "jp": [
        "葬送のフリーレン 第01話 「冒険の終わり」.ts",
        "葬送のフリーレン 第02話.ts",
        "葬送のフリーレン 第03v2話 「蒼月草」.mp4",
        "ダンジョン飯 第14話.mkv",
    ],
    "symbol": [
        "Anime Name #01 (BD 1080p).mkv",
        "Anime Name #02 (BD 1080p).mkv",
        "Anime_Name_EP03_x265.mkv",
        "Title [04v2] [1080p].mp4",
    ],
    "absolute": [
        "One Piece - 1085 [1080p].mp4",
        "One Piece - 1086 [1080p].mp4",
    ],
}

CATEGORY_DESCRIPTIONS = {
    "all": "すべての形式を一括生成",
    "fansub": "海外字幕組・リリースグループ形式 ([Group] Title - 01)",
    "se": "Season & Episode 形式 (Title_S01E01)",
    "jp": "日本語話数表記 (タイトル 第01話)",
    "symbol": "記号・話数前置形式 (Title #01, EP01)",
    "absolute": "通算話数形式 (Title - 1085)",
}

def main():
    parser = argparse.ArgumentParser(description="anitag デモ用動画ファイル生成ツール")
    parser.add_argument(
        "-t", "--type",
        choices=["all", "fansub", "se", "jp", "symbol", "absolute"],
        default="all",
        help="生成するファイル名の形式カテゴリを選択"
    )
    parser.add_argument(
        "-o", "--output",
        default="./demo_anime_files",
        help="出力先のディレクトリパス (デフォルト: ./demo_anime_files)"
    )

    args = parser.parse_args()

    selected_category = args.type
    target_dir = Path(args.output)
    target_dir.mkdir(parents=True, exist_ok=True)

    files_to_generate = []
    if selected_category == "all":
        for cat, files in PATTERNS_BY_CATEGORY.items():
            files_to_generate.extend(files)
    else:
        files_to_generate = PATTERNS_BY_CATEGORY.get(selected_category, [])

    print(f"デモ用ダミーファイルを生成中:")
    print(f"  ・出力形式: {selected_category} ({CATEGORY_DESCRIPTIONS[selected_category]})")
    print(f"  ・出力先:   {target_dir.resolve()}\n")

    count = 0
    for filename in files_to_generate:
        file_path = target_dir / filename
        file_path.touch(exist_ok=True)
        count += 1
        print(f"  └─ 作成: {filename}")

    print(f"\n生成完了: 計 {count} 件のダミーファイルを作成しました")
    print(f"anitag で {target_dir.resolve()} を選択してテストできます")

if __name__ == "__main__":
    main()
