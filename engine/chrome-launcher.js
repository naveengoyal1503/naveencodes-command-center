import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const WINDOWS_CHROME_PATHS = [
  path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe")
].filter(Boolean);

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(os.homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome")
];

const LINUX_CHROME_COMMANDS = [
  "google-chrome",
  "google-chrome-stable",
  "chromium-browser",
  "chromium"
];

export const isPortInUse = (port, host = "127.0.0.1") =>
  new Promise((resolve) => {
    const socket = net.createConnection({ port, host });

    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });
  });

export const resolveChromeCommand = () => {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  if (process.platform === "win32") {
    const found = WINDOWS_CHROME_PATHS.find((candidate) => fs.existsSync(candidate));
    if (found) {
      return found;
    }
  }

  if (process.platform === "darwin") {
    const found = MAC_CHROME_PATHS.find((candidate) => fs.existsSync(candidate));
    if (found) {
      return found;
    }
  }

  if (process.platform === "linux") {
    return LINUX_CHROME_COMMANDS[0];
  }

  return null;
};

export const launchChrome = async ({
  port = 9222,
  visible = false,
  logger = console,
  detached = true
} = {}) => {
  if (await isPortInUse(port)) {
    logger.log("Reusing existing Chrome session");
    return {
      reused: true,
      port,
      child: null,
      chromeCommand: null
    };
  }

  const chromeCommand = resolveChromeCommand();
  if (!chromeCommand) {
    throw new Error("Chrome not found. Set CHROME_PATH or install Google Chrome.");
  }

  const userDataDir =
    process.platform === "win32"
      ? "C:\\naveencodes-temp"
      : "/tmp/naveencodes-temp";

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    ...(visible ? [] : ["--headless=new"]),
    "about:blank"
  ];

  logger.log("Starting Chrome...");

  const child = spawn(chromeCommand, args, {
    detached,
    stdio: "ignore",
    windowsHide: !visible
  });

  child.once("error", (error) => {
    logger.error(`Chrome launch failed: ${error.message}`);
  });

  if (detached) {
    child.unref();
  }

  return {
    reused: false,
    port,
    child,
    chromeCommand
  };
};
