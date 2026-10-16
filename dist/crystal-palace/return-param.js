// Return trip from lesson-player / quiz back to the Crystal Palace (Phase 3, option A).
// Pure and dependency-free so lesson-player.js and quiz.js can import it. Only one destination is
// allowlisted; any other `return` value falls back to the caller's normal page.

export const PALACE_RETURN = "crystal-palace";
export const PALACE_PAGE = "crystal-palace.html";

const returnValue = (search) => {
  try {
    return new URLSearchParams(search || "").get("return");
  } catch {
    return null;
  }
};

export function isPalaceReturn(search) {
  return returnValue(search) === PALACE_RETURN;
}

// Where "exit / finished / back" should go: the palace when allowlisted, otherwise the fallback.
export function exitDestination(search, fallback = "learning.html") {
  return isPalaceReturn(search) ? PALACE_PAGE : fallback;
}

// Carry the palace return marker onto an internal link (e.g. lesson-player → quiz).
export function carryPalaceReturn(href, search) {
  if (!isPalaceReturn(search)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}return=${PALACE_RETURN}`;
}

const LESSON_CODE = /^[a-z0-9_-]{1,64}$/;

// Lesson link used by palace exhibits. Rejects anything that is not a plain lesson code.
export function palaceLessonHref(lessonCode) {
  if (!LESSON_CODE.test(String(lessonCode || ""))) return null;
  return `lesson-player.html?lesson=${encodeURIComponent(lessonCode)}&return=${PALACE_RETURN}`;
}
