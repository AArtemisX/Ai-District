// Where the online room API lives.
// Deployed: one Node server (scenario-online-server.mjs) serves the pages and /api/*, so it is the same origin.
// Local dev: pages from a static server on localhost (e.g. :4174) talk to the room server on :4180.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function defaultServerUrl({ hostname, port, origin }) {
  return LOCAL_HOSTS.has(hostname) && port !== "4180" ? "http://127.0.0.1:4180" : origin;
}
