export const MISSION_02_PREVIEW_PROGRESS_KEY = "aiDistrict.preview.mission-story-02-nancy.v1";

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function readMissionPreviewProgress(storage = window.sessionStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(MISSION_02_PREVIEW_PROGRESS_KEY) || "null");
    if (parsed?.schemaVersion !== 1 || parsed?.draftKey !== "mission-story-02-nancy-draft") return null;
    return {
      schemaVersion: 1,
      draftKey: parsed.draftKey,
      status: parsed.status === "preview_completed" ? "preview_completed" : "in_progress",
      scene_index: Math.max(0, Number(parsed.scene_index) || 0),
      scene_state: safeObject(parsed.scene_state),
      active_seconds: Math.max(0, Number(parsed.active_seconds) || 0),
      started_at: parsed.started_at || null,
      completed_at: parsed.completed_at || null,
    };
  } catch {
    return null;
  }
}

export function writeMissionPreviewProgress(progress, storage = window.sessionStorage) {
  const payload = {
    schemaVersion: 1,
    draftKey: "mission-story-02-nancy-draft",
    status: progress?.status === "preview_completed" ? "preview_completed" : "in_progress",
    scene_index: Math.max(0, Number(progress?.scene_index) || 0),
    scene_state: safeObject(progress?.scene_state),
    active_seconds: Math.max(0, Number(progress?.active_seconds) || 0),
    started_at: progress?.started_at || new Date().toISOString(),
    completed_at: progress?.status === "preview_completed" ? (progress.completed_at || new Date().toISOString()) : null,
  };
  storage.setItem(MISSION_02_PREVIEW_PROGRESS_KEY, JSON.stringify(payload));
  return payload;
}

export function clearMissionPreviewProgress(storage = window.sessionStorage) {
  storage.removeItem(MISSION_02_PREVIEW_PROGRESS_KEY);
}
