import { useState, useCallback, useEffect, useTransition } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { 
  FolderOpen, 
  Search, 
  RefreshCw, 
  Check, 
  Undo2, 
  FileVideo, 
  ArrowRight,
  AlertCircle,
  X,
  Sliders,
  Database,
  CheckCheck,
  Bookmark,
  Plus,
  Trash2,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  FileInfo, 
  ScanResult, 
  WorkItem, 
  EpisodeNode, 
  PreviewItem, 
  ExecuteResult,
  PresetItem
} from './types';

const BUILTIN_PRESETS: PresetItem[] = [
  {
    id: 'preset-standard',
    name: '標準 (話数 + サブタイトル)',
    pattern: '{work_title} - 第{ep_num:02d}話 「{ep_title}」.{ext}',
    isBuiltIn: true,
  },
  {
    id: 'preset-season-ep',
    name: '英語スタイル (S01E05)',
    pattern: '{work_title} S{season:02d}E{ep_num:02d} - {ep_title}.{ext}',
    isBuiltIn: true,
  },
  {
    id: 'preset-simple',
    name: 'シンプル (タイトル + 話数)',
    pattern: '{work_title} 第{ep_num:02d}話.{ext}',
    isBuiltIn: true,
  },
  {
    id: 'preset-bracket',
    name: '角カッコ形式',
    pattern: '[{work_title}] #{ep_num:02d} - {ep_title}.{ext}',
    isBuiltIn: true,
  },
  {
    id: 'preset-title-sub',
    name: '話数なし (作品名 + サブタイトル)',
    pattern: '{work_title} - {ep_title}.{ext}',
    isBuiltIn: true,
  },
];

const STORAGE_KEY_PATTERN = 'anitag_saved_pattern';
const STORAGE_KEY_CUSTOM_PRESETS = 'anitag_custom_presets';

export function App() {
  const [dirPath, setDirPath] = useState<string>('');
  const [scannedFiles, setScannedFiles] = useState<FileInfo[]>([]);
  const [scanStatusMsg, setScanStatusMsg] = useState<string>('');

  const [annictQuery, setAnnictQuery] = useState<string>('');
  const [annictWorks, setAnnictWorks] = useState<WorkItem[]>([]);
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [isSearchingAnnict, setIsSearchingAnnict] = useState<boolean>(false);

  const [annictToken, setAnnictToken] = useState<string>('');
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showTokenMask, setShowTokenMask] = useState<boolean>(false);

  const [pattern, setPattern] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PATTERN) || BUILTIN_PRESETS[0].pattern;
  });

  const [customPresets, setCustomPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newPresetName, setNewPresetName] = useState<string>('');
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'warning' } | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    invoke<string | null>('get_annict_token_cmd')
      .then((token) => {
        if (token) {
          setSavedToken(token);
          setAnnictToken(token);
        }
      })
      .catch((err) => console.error('Failed to load saved token:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PATTERN, pattern);
  }, [pattern]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(customPresets));
  }, [customPresets]);

  const showToast = useCallback((text: string, type: 'success' | 'danger' | 'warning' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const updatePreview = useCallback(async (
    files: FileInfo[],
    workTitle: string,
    episodes: EpisodeNode[],
    pat: string
  ) => {
    if (files.length === 0) {
      setPreviewItems([]);
      return;
    }

    const paths = files.map((f) => f.path);
    try {
      const items = await invoke<PreviewItem[]>('preview_rename_cmd', {
        filePaths: paths,
        workTitle: workTitle || 'アニメタイトル',
        episodes,
        pattern: pat,
      });
      startTransition(() => {
        setPreviewItems(items);
      });
    } catch (err) {
      console.error('Preview error:', err);
    }
  }, []);

  const handleScan = useCallback(async (targetPath?: string) => {
    const path = (targetPath !== undefined ? targetPath : dirPath).trim();
    if (!path) {
      showToast('パスを指定してください', 'warning');
      return;
    }

    setScanStatusMsg('スキャン中...');

    try {
      const res = await invoke<ScanResult>('scan_directory', { path });
      setScannedFiles(res.files);
      setScanStatusMsg(`${res.count} 件検出`);

      updatePreview(res.files, selectedWork?.title || annictQuery || 'アニメタイトル', selectedWork?.episodes || [], pattern);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setScanStatusMsg(`エラー: ${msg}`);
      showToast(`スキャン失敗: ${msg}`, 'danger');
    }
  }, [dirPath, selectedWork, annictQuery, pattern, updatePreview, showToast]);

  const handleBrowseFolder = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'フォルダ選択',
      });
      if (selected) {
        const pathStr = Array.isArray(selected) ? selected[0] : selected;
        setDirPath(pathStr);
        handleScan(pathStr);
      }
    } catch (err) {
      console.error('Folder dialog error:', err);
    }
  }, [handleScan]);

  const handleSearchAnnict = useCallback(async () => {
    const q = annictQuery.trim();
    if (!q) return;

    setIsSearchingAnnict(true);
    try {
      const works = await invoke<WorkItem[]>('search_annict_cmd', { 
        query: q,
        customToken: annictToken.trim() || undefined
      });
      setAnnictWorks(works);
      if (works.length === 0) {
        showToast('該当する作品がありません', 'warning');
      }
    } catch (err) {
      showToast(`検索エラー: ${err}`, 'danger');
    } finally {
      setIsSearchingAnnict(false);
    }
  }, [annictQuery, annictToken, showToast]);

  const handleSaveToken = useCallback(async () => {
    const t = annictToken.trim();
    try {
      await invoke('save_annict_token_cmd', { token: t });
      setSavedToken(t ? t : null);
      showToast(t ? 'アクセストークンを保存しました' : 'アクセストークンを削除しました', 'success');
      setShowTokenModal(false);
    } catch (err) {
      showToast(`トークン保存失敗: ${err}`, 'danger');
    }
  }, [annictToken, showToast]);

  const handleSelectWork = useCallback((work: WorkItem) => {
    setSelectedWork(work);
    setAnnictWorks([]);
    updatePreview(scannedFiles, work.title, work.episodes, pattern);
  }, [scannedFiles, pattern, updatePreview]);

  const handleClearSelectedWork = useCallback(() => {
    setSelectedWork(null);
    updatePreview(scannedFiles, annictQuery || 'アニメタイトル', [], pattern);
  }, [scannedFiles, annictQuery, pattern, updatePreview]);

  const handleSelectPreset = useCallback((presetPattern: string) => {
    setPattern(presetPattern);
    updatePreview(scannedFiles, selectedWork?.title || annictQuery || 'アニメタイトル', selectedWork?.episodes || [], presetPattern);
  }, [scannedFiles, selectedWork, annictQuery, updatePreview]);

  const handleAddCustomPreset = useCallback(() => {
    const name = newPresetName.trim();
    if (!name) {
      showToast('プリセット名を入力してください', 'warning');
      return;
    }

    const newItem: PresetItem = {
      id: `custom-${Date.now()}`,
      name,
      pattern,
      isBuiltIn: false,
    };

    setCustomPresets((prev) => [...prev, newItem]);
    setNewPresetName('');
    setIsSavingPreset(false);
    showToast('プリセット保存完了', 'success');
  }, [newPresetName, pattern, showToast]);

  const handleDeleteCustomPreset = useCallback((id: string, name: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    showToast(`プリセット「${name}」を削除`, 'success');
  }, [showToast]);

  const handleExecuteRename = useCallback(async () => {
    if (previewItems.length === 0) return;

    setIsExecuting(true);
    try {
      const res = await invoke<ExecuteResult>('execute_rename_cmd', { items: previewItems });
      if (res.success_count > 0) {
        showToast(`リネーム完了 (${res.success_count}件)`, 'success');
        handleScan();
      } else if (res.errors.length > 0) {
        showToast(`エラー: ${res.errors[0]}`, 'danger');
      }
    } catch (err) {
      showToast(`実行エラー: ${err}`, 'danger');
    } finally {
      setIsExecuting(false);
    }
  }, [previewItems, showToast, handleScan]);

  const handleUndo = useCallback(async () => {
    try {
      const res = await invoke<ExecuteResult>('undo_rename_cmd');
      if (res.success_count > 0) {
        showToast(`元に戻しました (${res.success_count}件)`, 'success');
        handleScan();
      } else if (res.errors.length > 0) {
        showToast(`Undoエラー: ${res.errors[0]}`, 'warning');
      }
    } catch (err) {
      showToast(`Undo失敗: ${err}`, 'danger');
    }
  }, [showToast, handleScan]);

  const handleInsertTag = useCallback((tag: string) => {
    setPattern((prev) => {
      const next = prev + tag;
      updatePreview(scannedFiles, selectedWork?.title || annictQuery || 'アニメタイトル', selectedWork?.episodes || [], next);
      return next;
    });
  }, [scannedFiles, selectedWork, annictQuery, updatePreview]);

  const readyCount = previewItems.filter((i) => i.status === 'ready').length;
  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-100 tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            anitag
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-500">v0.1.0</span>
        </div>

        <div className="flex-1 max-w-2xl flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="フォルダまたはファイルパス..."
              className="w-full h-8 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded px-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none"
            />
          </div>
          <button
            onClick={handleBrowseFolder}
            className="h-8 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded flex items-center gap-1.5 transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            参照
          </button>
          <button
            onClick={() => handleScan()}
            className="h-8 px-3.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded flex items-center gap-1.5 transition cursor-pointer"
          >
            スキャン
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTokenModal(true)}
            className={`h-8 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded flex items-center gap-1.5 transition cursor-pointer ${
              savedToken ? 'text-emerald-400 border border-emerald-800/50' : 'text-zinc-400'
            }`}
            title="Annict API アクセストークン設定"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{savedToken ? 'Token保存済' : 'API Token'}</span>
          </button>

          <button
            onClick={handleUndo}
            className="h-8 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded flex items-center gap-1.5 transition cursor-pointer"
            title="直前の操作を取り消す"
          >
            <Undo2 className="w-3.5 h-3.5 text-zinc-400" />
            元に戻す
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 gap-5 overflow-y-auto shrink-0">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Annict 連携
            </div>
            
            <div className="flex gap-1.5">
              <input
                type="text"
                value={annictQuery}
                onChange={(e) => setAnnictQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAnnict()}
                placeholder="アニメタイトルを検索..."
                className="flex-1 h-8 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded px-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none"
              />
              <button
                onClick={handleSearchAnnict}
                disabled={isSearchingAnnict}
                className="h-8 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded flex items-center justify-center transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            {selectedWork ? (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded text-xs text-emerald-300 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-100 truncate">{selectedWork.title}</div>
                  <div className="text-[11px] text-emerald-400/80">{selectedWork.episodes_count}話の情報を取得</div>
                </div>
                <button
                  onClick={handleClearSelectedWork}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  title="選択解除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            {annictWorks.length > 0 ? (
              <div className="flex flex-col gap-1 max-h-44 overflow-y-auto border border-zinc-800 rounded p-1 bg-zinc-950">
                {annictWorks.map((work) => (
                  <div
                    key={work.annict_id}
                    onClick={() => handleSelectWork(work)}
                    className="p-2 hover:bg-zinc-800 rounded cursor-pointer transition flex justify-between items-center"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-medium text-zinc-200 truncate">{work.title}</div>
                      <div className="text-[10px] text-zinc-500">{work.media || 'TV'} · {work.season_year || ''} ({work.episodes_count}話)</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded shrink-0">選択</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <hr className="border-zinc-800" />

          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                命名フォーマット
              </div>

              <button
                onClick={() => setIsSavingPreset(!isSavingPreset)}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                title="現在のフォーマットを保存"
              >
                <Plus className="w-3 h-3" /> 保存
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="presetSelect" className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-zinc-400" /> プリセット
              </label>
              <select
                id="presetSelect"
                value={allPresets.find((p) => p.pattern === pattern)?.id || ''}
                onChange={(e) => {
                  const found = allPresets.find((p) => p.id === e.target.value);
                  if (found) handleSelectPreset(found.pattern);
                }}
                className="h-8 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded px-2 text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="" disabled>-- プリセットを選択 --</option>
                <optgroup label="標準プリセット">
                  {BUILTIN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                {customPresets.length > 0 ? (
                  <optgroup label="カスタムプリセット">
                    {customPresets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>

            {isSavingPreset ? (
              <div className="p-2 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-zinc-300">新規プリセット保存</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="プリセット名..."
                    className="flex-1 h-7 bg-zinc-900 border border-zinc-800 rounded px-2 text-xs text-zinc-100 outline-none"
                  />
                  <button
                    onClick={handleAddCustomPreset}
                    className="px-2.5 h-7 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded cursor-pointer"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : null}

            {customPresets.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">カスタムプリセット:</span>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                  {customPresets.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 bg-zinc-950 border border-zinc-800 rounded">
                      <span
                        onClick={() => handleSelectPreset(p.pattern)}
                        className="truncate text-zinc-300 hover:text-white cursor-pointer"
                      >
                        {p.name}
                      </span>
                      <button
                        onClick={() => handleDeleteCustomPreset(p.id, p.name)}
                        className="text-zinc-600 hover:text-rose-400 p-0.5 cursor-pointer ml-1"
                        title="削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5 mt-1">
              <label htmlFor="patternInput" className="text-[11px] text-zinc-400 font-medium">パターン編集</label>
              <input
                id="patternInput"
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="h-8 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded px-2.5 text-xs font-mono text-zinc-100 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-zinc-500">変数タグ (クリックで挿入):</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { tag: '{work_title}', label: '{work_title}' },
                  { tag: '{ep_num:02d}', label: '{ep_num:02d}' },
                  { tag: '{ep_num}', label: '{ep_num}' },
                  { tag: '{ep_title}', label: '{ep_title}' },
                  { tag: '{season:02d}', label: '{season:02d}' },
                  { tag: '{season}', label: '{season}' },
                  { tag: '.{ext}', label: '.{ext}' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => handleInsertTag(item.tag)}
                    className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-[10px] rounded transition cursor-pointer"
                    title={`変数 ${item.tag} を挿入`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => updatePreview(scannedFiles, selectedWork?.title || annictQuery || 'アニメタイトル', selectedWork?.episodes || [], pattern)}
              className="mt-1 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> プレビュー更新
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 w-24">状態</th>
                  <th className="py-2.5 px-3 w-20">話数</th>
                  <th className="py-2.5 px-4">現在のファイル名</th>
                  <th className="py-2.5 px-1 w-6"></th>
                  <th className="py-2.5 px-4">リネーム後</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {previewItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-28 text-center text-zinc-600">
                      <FileVideo className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
                      <p className="text-xs">ファイルが選択されていません</p>
                    </td>
                  </tr>
                ) : (
                  previewItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/60 transition">
                      <td className="py-2.5 px-4">
                        {item.status === 'ready' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">READY</span>
                        ) : item.status === 'unchanged' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">SKIP</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">CONFLICT</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-500">
                        {item.parsed.episode ? `第${item.parsed.episode}話` : '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400 break-all">
                        {item.original_filename}
                      </td>
                      <td className="py-2.5 px-1 text-center text-zinc-600">
                        <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-sky-400 break-all">
                        {item.new_filename}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="h-12 bg-zinc-900 border-t border-zinc-800 px-4 flex items-center justify-between shrink-0">
            <div className="text-xs text-zinc-500 font-mono">
              {scanStatusMsg ? scanStatusMsg : '未選択'}
            </div>

            <button
              onClick={handleExecuteRename}
              disabled={isExecuting || readyCount === 0}
              className="h-8 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              リネーム実行 ({readyCount})
            </button>
          </footer>
        </main>
      </div>

      {showTokenModal ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                <Key className="w-4 h-4 text-sky-400" />
                Annict API トークン設定
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Annict の個人用アクセストークンを入力してください。
              </p>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[11px] text-zinc-400 font-medium">アクセストークン</label>
                <div className="relative flex items-center">
                  <input
                    type={showTokenMask ? 'text' : 'password'}
                    value={annictToken}
                    onChange={(e) => setAnnictToken(e.target.value)}
                    placeholder="トークンを入力..."
                    className="w-full h-8 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded pl-2.5 pr-8 text-xs font-mono text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenMask(!showTokenMask)}
                    className="absolute right-2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showTokenMask ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  setAnnictToken('');
                  handleSaveToken();
                }}
                className="px-3 h-8 bg-zinc-800 hover:bg-rose-950 hover:text-rose-400 text-zinc-400 text-xs font-medium rounded transition cursor-pointer"
              >
                削除
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="px-3 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveToken}
                  className="px-4 h-8 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded transition cursor-pointer"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`fixed bottom-14 right-6 px-4 py-2.5 bg-zinc-900 border rounded shadow-2xl text-xs font-medium flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'border-emerald-600/50 text-emerald-400' : toast.type === 'danger' ? 'border-rose-600/50 text-rose-400' : 'border-amber-600/50 text-amber-400'
        }`}>
          {toast.type === 'danger' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      ) : null}
    </div>
  );
}

export default App;
