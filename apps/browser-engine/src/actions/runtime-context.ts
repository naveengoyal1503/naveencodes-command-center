export interface BrowserActionRuntime {
  client: any;
  evaluateSelector: (selector: string | undefined, body: string) => Promise<void>;
  captureScreenshot: (filePath?: string) => Promise<string>;
}
