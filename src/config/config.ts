export interface AppConfig {
  geminiApiKey: string;
  geminiModel: string;
  storageMode: 'local' | 'memory';
}

export const config: AppConfig = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  geminiModel: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash',
  storageMode: (import.meta.env.VITE_STORAGE_MODE as 'local' | 'memory') || 'local',
};
