import { html } from "./runtime.js";
import { CharacterToken } from "./CharacterToken.js";

export const PLAYER_TOKEN_OFFSET = [-.44, 0, .34];

export function PlayerToken(props) {
  return html`<${CharacterToken} ...${props} color="#32b9ff" offset=${PLAYER_TOKEN_OFFSET} />`;
}
