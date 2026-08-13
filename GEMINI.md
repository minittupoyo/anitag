# ANITAG - Project Specific Guidelines & Architecture

`anitag` は、Pure Native Tauri v2 (Rust) + React 19 + TypeScript + TailwindCSS v4 で構築された高速アニメ自動リネーム＆メタデータ管理デスクトップアプリケーションです。

---

## 1. プロジェクト固有の UI/UX ガイドライン

### カラーシステム (Tailwind `zinc` パレット一貫使用)
- ヘキサコード (`#121214` 等) をコード内に分散させず、Tailwind CSS の `zinc` パレットに100%統一する。
  - **全画面背景**: `bg-zinc-950`
  - **パネル・ヘッダー・サイドバー**: `bg-zinc-900`
  - **ボーダー・区切り線**: `border-zinc-800` / `border-zinc-700`
  - **入力フォーム**: `bg-zinc-950 border-zinc-800 text-zinc-100`
  - **メインテキスト**: `text-zinc-100` / `text-zinc-200`
  - **サブテキスト**: `text-zinc-400` / `text-zinc-500`
  - **状態シグナル**: `emerald-600` (`READY`, リネーム実行), `sky-400` (変更後ファイル名), `rose-400` (`CONFLICT`)

### タイポグラフィ (Fontsource Variable)
- フォント指定は外部 CDN やシステム標準に依存せず、npm パッケージ `@fontsource-variable/plus-jakarta-sans` および `@fontsource-variable/noto-sans-jp` を使用する。

### 非勝手性 (No Presumptuous Input)
- **検索欄への勝手な自動入力・自動検索の禁止**:
  - フォルダースキャンを実行しても、Annict 検索欄 (`annictQuery`) に自動で文字を入力したり自動検索を走らせてはならない。
  - ユーザーが手動で検索欄にタイトルを入力し「検索」を押す（または Enter を押す）まで、検索処理は実行しない。

### 本格プロツール環境 UI
- SaaS LP 風の「1」「2」「3」丸数字ステップカード表現は避け、一体型のプロツール構成（ヘッダーツールバー ＋ 左コントロールサイドバー ＋ 右比較テーブル）を保持する。

---

## 2. アーキテクチャ & Tauri v2 運用ルール

### Tauri プラグイン追加ルール
- Tauri プラグインを追加・更新する際は、必ず Tauri CLI を利用する:
  ```bash
  npx tauri add <pluginname>
  # 例: npx tauri add dialog, npx tauri add fs
  ```

### データ保存と永続化
- **リネームUndo履歴**: `~/.anitag_history.json` にローカルセッション履歴を保存し、`undo_rename_cmd` でいつでも直前のリネームを元に戻せるように保持する。
- **命名フォーマット & プリセットの永続化**: `localStorage` (`anitag_saved_pattern`, `anitag_custom_presets`) を使用し、アプリ再起動後も設定を自動復元する。

---

## 3. コマンドラインリファレンス

```bash
# 開発モード起動
npx tauri dev

# フロントエンドビルド確認
npm run build

# バックエンドRustビルド確認
cargo check --manifest-path src-tauri/Cargo.toml
```
