const PAGE_BACK_TARGETS = Object.freeze({
  "learning.html": { href: "lobby.html", label: "Lobby" },
  "ai-world.html": { href: "lobby.html", label: "Lobby" },
  "game.html": { href: "ai-world.html", label: "AI World" },
  "results.html": { href: "lobby.html", label: "Lobby" },
});

const pageName = window.location.pathname.split("/").pop() || "index.html";
const backTarget = PAGE_BACK_TARGETS[pageName];
const header = document.querySelector(".lobby-header, .game-topbar, .flow-header");

if (backTarget && header && !header.querySelector(".page-back-link")) {
  const backLink = document.createElement("a");
  backLink.className = "page-back-link";
  backLink.href = backTarget.href;
  backLink.setAttribute("aria-label", `ย้อนกลับไปหน้า ${backTarget.label}`);
  backLink.innerHTML = '<span aria-hidden="true">←</span><b>ย้อนกลับ</b>';
  header.insertBefore(backLink, header.children[1] || null);
}
