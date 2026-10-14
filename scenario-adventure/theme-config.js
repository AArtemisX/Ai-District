export const SCENARIO_CATEGORIES = Object.freeze({
  AI_LITERACY: "AI_LITERACY",
  FAIRNESS: "FAIRNESS",
  PRIVACY: "PRIVACY",
  SAFETY: "SAFETY",
  TRANSPARENCY: "TRANSPARENCY",
  ACCOUNTABILITY: "ACCOUNTABILITY",
});

export const DEFAULT_THEME_ID = "sky-city-foundation";

export const SCENARIO_THEMES = Object.freeze([
  Object.freeze({
    themeId: DEFAULT_THEME_ID,
    name: "นครลอยฟ้า AI District",
    description: "ธีมเริ่มต้นที่ใช้กระดาน 3D ปัจจุบันและสถานการณ์ AI รอบตัวนักเรียน",
    scenarioCategories: Object.freeze(Object.values(SCENARIO_CATEGORIES)),
    visualPalette: Object.freeze({ sky: "#b9eaff", primary: "#55b8ff", accent: "#ffcf54", support: "#ad7cf6" }),
    mapAssetReference: "current-low-poly-board",
    status: "FOUNDATION",
  }),
]);

export function getTheme(themeId = DEFAULT_THEME_ID) {
  return SCENARIO_THEMES.find((theme) => theme.themeId === themeId) || SCENARIO_THEMES[0];
}

export function getScenarioCategoryForTile(tileIndex, themeId = DEFAULT_THEME_ID) {
  const categories = getTheme(themeId).scenarioCategories;
  const normalized = Math.abs(Math.trunc(Number(tileIndex) || 0));
  return categories[normalized % categories.length];
}
