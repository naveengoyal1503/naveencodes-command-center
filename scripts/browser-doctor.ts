import { serverConfig } from "../apps/server/src/config.js";

console.log(JSON.stringify({
  chrome: serverConfig.chrome,
  browserArtifacts: serverConfig.paths.browserArtifacts,
  note: "Install Chrome/Chromium locally before using the CDP browser engine."
}, null, 2));
