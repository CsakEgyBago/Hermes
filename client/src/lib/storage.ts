const API_KEY_STORAGE_KEY = "weightcalc.apiKey";
const MODEL_STORAGE_KEY = "weightcalc.model";

export function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE_KEY, key);
    else localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. private browsing) — nothing to persist to
  }
}

export function loadModel(defaultModel: string): string {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) ?? defaultModel;
  } catch {
    return defaultModel;
  }
}

export function saveModel(model: string): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  } catch {
    // localStorage unavailable (e.g. private browsing) — nothing to persist to
  }
}
