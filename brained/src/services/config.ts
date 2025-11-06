export function getProjectId(): string {
  const fromStorage = safeGet('pagepulse_projectId');
  if (fromStorage) return fromStorage;
  const fromEnv = (import.meta as any).env?.VITE_PROJECT_ID;
  if (fromEnv) return String(fromEnv);
  return 'default';
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
