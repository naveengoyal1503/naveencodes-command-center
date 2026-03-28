#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { connectToBrowser } from "../engine/browser-connector.js";
import { launchChrome, isPortInUse } from "../engine/chrome-launcher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

const visible = process.argv.includes("--visible");
const testMode = process.env.NC_AGENT_TEST_MODE === "true";
const serverPort = Number(process.env.SERVER_PORT || 4000);
const chromePort = Number(process.env.CHROME_REMOTE_PORT || 9222);

let serverChild = null;
let chromeChild = null;
let browserClient = null;

const log = (message) => console.log(message);
const error = (message) => console.error(message);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tsxCliModule = path.join(rootDir, "node_modules", "tsx", "dist", "cli.mjs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(child);
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });

const installDependenciesIfNeeded = async () => {
  if (fs.existsSync(path.join(rootDir, "node_modules"))) {
    return;
  }

  log("Installing dependencies...");
  await runCommand(npmCommand, ["install"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false
  });
};

const isServerReady = async () => {
  try {
    const response = await fetch(`http://127.0.0.1:${serverPort}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
};

const waitForServer = async () => {
  for (;;) {
    if (await isServerReady()) {
      return;
    }

    await wait(1000);
  }
};

const startServer = async () => {
  log("Starting server...");

  if (await isPortInUse(serverPort)) {
    if (await isServerReady()) {
      log(`Reusing existing server on port ${serverPort}`);
      return null;
    }

    throw new Error(`Port ${serverPort} is already in use by a non-agent process.`);
  }

  if (!fs.existsSync(tsxCliModule)) {
    throw new Error("tsx runtime not found after install.");
  }

  const child = spawn(process.execPath, [tsxCliModule, "apps/server/src/index.ts"], {
    cwd: rootDir,
    env: {
      ...process.env,
      CHROME_REMOTE_PORT: String(chromePort)
    },
    stdio: "inherit",
    detached: false
  });

  child.once("error", (spawnError) => {
    error(`Server failed to start: ${spawnError.message}`);
  });

  await waitForServer();
  return child;
};

const main = async () => {
  try {
    await installDependenciesIfNeeded();

    serverChild = await startServer();

    const chromeSession = await launchChrome({
      port: chromePort,
      visible,
      logger: { log, error },
      detached: !testMode
    });
    chromeChild = chromeSession.child;

    browserClient = await connectToBrowser({
      port: chromePort,
      logger: { log }
    });

    log("AI Agent Ready 🚀");
    log("System Ready");

    if (testMode) {
      await browserClient?.close();
      serverChild?.kill();
      chromeChild?.kill();
      return;
    }

    process.stdin.resume();
  } catch (mainError) {
    error(mainError instanceof Error ? mainError.message : "CLI boot failed.");
    process.exitCode = 1;
  }
};

process.on("SIGINT", () => {
  serverChild?.kill();
  if (testMode) {
    chromeChild?.kill();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  serverChild?.kill();
  if (testMode) {
    chromeChild?.kill();
  }
  process.exit(0);
});

void main();
