#!/usr/bin/env python3
"""
anitag デモ用アニメ動画ファイル生成スクリプト
指定カテゴリに対して12話分のリアルなダミーファイルを生成します。
・架空のグループ名を実行ごとに1つランダム決定して固定
・話数のうち一定確率で v2 / v3 サフィックスをランダム混入
"""
import argparse
import random
from pathlib import Path

# 完全に架空のリリースグループ名（実在する名称は使用しない）
RELEASE_GROUPS = [
    "[AniSubGroup]",
    "[PixelFansub]",
    "[SkyEncode]",
    "[NekoSubs]",
    "[StarlightRip]",
    "[ZeroSub]",
]

TV_STATIONS = [
    "[TOKYO MX]",
    "[BS11]",
    "[AT-X]",
    "[MBS]",
]

SAMPLE_SUBTITLES = [
    "冒険の終わり", "嘘つき", "蒼月草", "魂の眠る地", "死者の魔法",
    "村の英雄", "おとぎ話のようなもの", "初陣", "断頭台のアウラ", "神技のレヴォルテ",
    "北側の諸国", "本物の英雄"
]

def generate_filenames(category: str) -> list[str]:
    # 実行ごとに固定するランダムな架空グループ名・放送局名
    group_name = random.choice(RELEASE_GROUPS)
    station_name = random.choice(TV_STATIONS)
    
    filenames = []
    total_episodes = 12

    for ep in range(1, total_episodes + 1):
        # 約25%の確率で v2 / v3 表記を混ぜる
        v_suffix = ""
        r = random.random()
        if r < 0.20:
            v_suffix = "v2"
        elif r < 0.25:
            v_suffix = "v3"

        ep_str_2d = f"{ep:02d}{v_suffix}"
        sub_title = SAMPLE_SUBTITLES[(ep - 1) % len(SAMPLE_SUBTITLES)]

        if category == "fansub":
            filenames.append(f"{group_name} Sousou no Frieren - {ep_str_2d} [1080p HEVC].mkv")
        elif category == "se":
            filenames.append(f"Sousou_no_Frieren_S01E{ep_str_2d}_1080p.mkv")
        elif category == "jp":
            filenames.append(f"葬送のフリーレン 第{ep_str_2d}話 「{sub_title}」 {station_name}.ts")
        elif category == "symbol":
            filenames.append(f"Sousou no Frieren #{ep_str_2d} (BD 1080p).mkv")
        elif category == "absolute":
            filenames.append(f"Sousou no Frieren - {ep + 1000}{v_suffix} [1080p].mp4")

    return filenames

def main():
    parser = argparse.ArgumentParser(description="anitag デモ用動画ファイル生成ツール")
    parser.add_argument(
        "-t", "--type",
        choices=["all", "fansub", "se", "jp", "symbol", "absolute"],
        default="all",
        help="生成するファイル名の形式カテゴリを選択 (デフォルト: all)"
    )
    parser.add_argument(
        "-o", "--output",
        default="./demo_anime_files",
        help="出力先のディレクトリパス (デフォルト: ./demo_anime_files)"
    )

    args = parser.parse_args()

    target_dir = Path(args.output)
    target_dir.mkdir(parents=True, exist_ok=True)

    files_to_generate = []
    if args.type == "all":
        for cat in ["fansub", "se", "jp", "symbol"]:
            files_to_generate.extend(generate_filenames(cat))
    else:
        files_to_generate = generate_filenames(args.type)

    print(f"デモ用ダミーファイルを生成中:")
    print(f"  ・出力形式: {args.type}")
    print(f"  ・出力先:   {target_dir.resolve()}\n")

    count = 0
    for filename in files_to_generate:
        file_path = target_dir / filename
        file_path.touch(exist_ok=True)
        count += 1
        print(f"  └─ 作成: {filename}")

    print(f"\n生成完了: 計 {count} 件（12話分）のダミーファイルを作成しました")
    print(f"anitag で {target_dir.resolve()} を選択してテストできます")

if __name__ == "__main__":
    main()
