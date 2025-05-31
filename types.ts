
export interface WordPair {
  id: string; // Unique identifier for the pair, e.g., 'pair-annoyed'
  english: string;
  german: string;
}

export interface DisplayWord {
  id: string; // Unique ID for this specific rendered item, e.g., 'english-0-annoyed'
  pairId: string; // Links to WordPair.id
  text: string;
  displayNumber: number | string; // The number/char to show on the card (e.g., 1, 'A')
  isMatched: boolean;
  isSelected: boolean;
  isRevealedIncorrect: boolean; // To temporarily show incorrect feedback styling
  language: 'english' | 'german';
}

export enum GameStatus {
  Playing = "PLAYING", // Actively playing a set
  AllMatchedInSet = "ALL_MATCHED_IN_SET", // All pairs in the current set are matched (transitional)
  AllSetsCompleted = "ALL_SETS_COMPLETED", // All pairs from the CSV are matched
  FileNotLoaded = "FILE_NOT_LOADED", // Initial state, waiting for CSV or selection
  LoadingFile = "LOADING_FILE", // CSV/XLSX is being processed, or manifest/predefined file is loading
  FileError = "FILE_ERROR", // Error during file processing
}

export interface PredefinedFile {
  name: string;
  path: string; // For files from manifest.json, this is the server path. For local files, a generated ID.
  description?: string;
  isLocal?: boolean; // True if the file was uploaded by the user in the current session
  arrayBuffer?: ArrayBuffer; // Holds the data for isLocal files
}
