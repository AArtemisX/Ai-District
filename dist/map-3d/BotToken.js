import { html } from "./runtime.js";
import { CharacterToken } from "./CharacterToken.js";

export const BOT_TOKEN_OFFSET = [.44, 0, -.34];

export function BotToken(props) {
  return html`<${CharacterToken} ...${props} color="#ff5c9d" offset=${BOT_TOKEN_OFFSET} />`;
}
