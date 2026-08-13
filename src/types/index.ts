export interface ParsedFile {
  original_filename: string;
  extension: string;
  episode: number | null;
  season: number | null;
  guessed_title: string;
}

export interface EpisodeNode {
  annict_id?: number | null;
  number?: number | null;
  number_text?: string | null;
  title?: string | null;
}

export interface WorkItem {
  annict_id: number;
  title: string;
  media?: string | null;
  season_year?: number | null;
  episodes_count: number;
  episodes: EpisodeNode[];
}

export interface FileInfo {
  path: string;
  name: string;
  size_bytes: number;
  parsed: ParsedFile;
}

export interface ScanResult {
  directory: string;
  count: number;
  most_common_title: string;
  files: FileInfo[];
}

export interface PreviewItem {
  original_path: string;
  original_filename: string;
  directory: string;
  new_filename: string;
  new_path: string;
  parsed: ParsedFile;
  is_changed: boolean;
  has_conflict: boolean;
  status: 'ready' | 'unchanged' | 'conflict';
}

export interface RenameRecord {
  from: string;
  to: string;
}

export interface ExecuteResult {
  success_count: number;
  error_count: number;
  records: RenameRecord[];
  errors: string[];
}

export interface PresetItem {
  id: string;
  name: string;
  pattern: string;
  isBuiltIn?: boolean;
}
