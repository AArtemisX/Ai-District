import { CHARACTER_BY_ID } from "./character-roster.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

export function StoryCharacterPortrait({ characterId, active = true, size = "medium", speakerLabel = "" } = {}) {
  const character = CHARACTER_BY_ID[characterId];
  if (!character) return "";
  const label = speakerLabel || character.displayName;
  const initials = character.displayName.slice(0, 2).toUpperCase();
  return `<figure class="story-character-portrait ${active ? "is-active" : "is-inactive"} size-${escapeHtml(size)}" style="--portrait-position:${escapeHtml(character.portrait.objectPosition)}" data-character-id="${escapeHtml(character.id)}">
    <div class="story-character-portrait__frame"><span class="story-character-portrait__fallback" aria-hidden="true">${escapeHtml(initials)}</span><img src="${escapeHtml(character.artwork.src)}" alt="ภาพบทสนทนาของ ${escapeHtml(character.displayName)}" /></div>
    <figcaption>${escapeHtml(label)}</figcaption>
  </figure>`;
}

