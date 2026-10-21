export const BASIC_PREVIEW_DAILY_LIMIT = 5;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storageKey(userId: string, date: Date) {
  return `styleai:basic-preview:${userId}:${dateKey(date)}`;
}

export function getDailyBasicPreviewCount(
  userId: string | null | undefined,
  storage: StorageLike = window.localStorage,
  date = new Date(),
) {
  if (!userId) return 0;
  try {
    const stored = Number(storage.getItem(storageKey(userId, date)) ?? 0);
    return Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
  } catch {
    return 0;
  }
}

export function useDailyBasicPreview(
  userId: string | null | undefined,
  storage: StorageLike = window.localStorage,
  date = new Date(),
) {
  if (!userId) return { allowed: false, count: 0, remaining: BASIC_PREVIEW_DAILY_LIMIT };

  try {
    const key = storageKey(userId, date);
    const stored = Number(storage.getItem(key) ?? 0);
    const count = Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
    if (count >= BASIC_PREVIEW_DAILY_LIMIT) {
      return { allowed: false, count, remaining: 0 };
    }

    const nextCount = count + 1;
    storage.setItem(key, String(nextCount));
    return {
      allowed: true,
      count: nextCount,
      remaining: BASIC_PREVIEW_DAILY_LIMIT - nextCount,
    };
  } catch {
    return { allowed: false, count: 0, remaining: BASIC_PREVIEW_DAILY_LIMIT };
  }
}