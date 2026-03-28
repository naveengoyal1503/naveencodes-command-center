import { createApp } from "./app.js";
import { serverConfig } from "./config.js";

const boot = async () => {
  const app = await createApp();
  app.listen(serverConfig.port, serverConfig.host, () => {
    console.log(`NaveenCodes AI Agent server listening at http://${serverConfig.host}:${serverConfig.port}`);
  });
};

void boot();
