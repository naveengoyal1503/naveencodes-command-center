export type BrowserActionType =
  | "openUrl"
  | "navigate"
  | "click"
  | "type"
  | "scroll"
  | "screenshot"
  | "wait"
  | "extractText"
  | "extractHtml"
  | "extractLinks";

export interface BrowserAction {
  type: BrowserActionType;
  url?: string;
  selector?: string;
  text?: string;
  x?: number;
  y?: number;
  delayMs?: number;
  path?: string;
  attribute?: string;
}

export interface BrowserConsoleEntry {
  type: string;
  message: string;
  timestamp: string;
}

export interface BrowserNetworkEntry {
  type: "request" | "response" | "failure";
  url: string;
  method?: string;
  status?: number;
  timestamp: string;
  details?: string;
}

export interface BrowserExecutionResult {
  success: boolean;
  currentUrl?: string;
  title?: string;
  screenshotPath?: string;
  consoleLogs: BrowserConsoleEntry[];
  networkLogs: BrowserNetworkEntry[];
  extracted: Array<Record<string, unknown>>;
  errors: string[];
  steps: Array<{
    action: BrowserActionType;
    summary: string;
  }>;
}
