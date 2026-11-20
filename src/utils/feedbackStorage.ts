export type ClarityVote = 'up' | 'down';

export interface TopicFeedbackEntry {
  topicId: string;
  topicLabel: string;
  vote: ClarityVote;
  updatedAt: string;
}

const FEEDBACK_STORAGE_KEY = 'reportsamjho_clarity_feedback_v1';

function readFeedbackMap(): Record<string, TopicFeedbackEntry> {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFeedbackMap(map: Record<string, TopicFeedbackEntry>): void {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save clarity feedback', err);
  }
}

export function getTopicFeedback(topicId: string): ClarityVote | null {
  const key = topicId.trim().toLowerCase();
  const map = readFeedbackMap();
  return map[key]?.vote || null;
}

export function saveTopicFeedback(
  topicId: string,
  topicLabel: string,
  vote: ClarityVote
): void {
  const key = topicId.trim().toLowerCase();
  if (!key) return;
  const map = readFeedbackMap();
  map[key] = {
    topicId: key,
    topicLabel: topicLabel || topicId,
    vote,
    updatedAt: new Date().toISOString(),
  };
  writeFeedbackMap(map);
}

export function getThumbsDownTopics(): TopicFeedbackEntry[] {
  const map = readFeedbackMap();
  return Object.values(map)
    .filter((item) => item.vote === 'down')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function clearAllFeedback(): void {
  try {
    localStorage.removeItem(FEEDBACK_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear feedback', err);
  }
}
