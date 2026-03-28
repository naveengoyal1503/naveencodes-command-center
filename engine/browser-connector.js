import CDP from "chrome-remote-interface";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectToBrowser = async ({
  host = "127.0.0.1",
  port = 9222,
  retryMs = 1000,
  logger = console
} = {}) => {
  logger.log("Connecting to browser...");

  for (;;) {
    try {
      const client = await CDP({ host, port });
      logger.log(`Connected to browser via ws://localhost:${port}`);
      return client;
    } catch (error) {
      logger.log(`Waiting for Chrome on ws://localhost:${port}...`);
      await delay(retryMs);
    }
  }
};
