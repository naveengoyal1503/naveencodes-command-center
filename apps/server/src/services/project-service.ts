import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { serverConfig } from "../config.js";
import type { ProjectRecord } from "../types.js";

export class ProjectService {
  async list(ownerId: string) {
    await fs.mkdir(serverConfig.paths.projectsRoot, { recursive: true });
    const entries = await fs.readdir(serverConfig.paths.projectsRoot, { withFileTypes: true });
    const records: ProjectRecord[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const metaPath = path.join(serverConfig.paths.projectsRoot, entry.name, "project.json");
      try {
        const raw = await fs.readFile(metaPath, "utf8");
        const project = JSON.parse(raw) as ProjectRecord;
        if (project.ownerId === ownerId) {
          records.push(project);
        }
      } catch {
        continue;
      }
    }

    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async create(input: {
    ownerId: string;
    name: string;
    prompt: string;
    type: ProjectRecord["type"];
    framework: ProjectRecord["framework"];
  }) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const projectRoot = path.join(serverConfig.paths.projectsRoot, slug);
    await fs.mkdir(projectRoot, { recursive: true });

    const project: ProjectRecord = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      slug,
      prompt: input.prompt,
      type: input.type,
      framework: input.framework,
      createdAt: new Date().toISOString(),
      path: projectRoot
    };

    await fs.writeFile(path.join(projectRoot, "project.json"), `${JSON.stringify(project, null, 2)}\n`);
    await fs.writeFile(path.join(projectRoot, "index.html"), this.renderHtml(project));
    await fs.writeFile(path.join(projectRoot, "styles.css"), this.renderCss());
    await fs.writeFile(path.join(projectRoot, "app.js"), this.renderJs(project));
    return project;
  }

  private renderHtml(project: ProjectRecord) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="shell">
      <p class="eyebrow">NaveenCodes AI Agent Generated Project</p>
      <h1>${project.name}</h1>
      <p>${project.prompt}</p>
      <div class="meta">
        <span>Type: ${project.type}</span>
        <span>Framework: ${project.framework}</span>
      </div>
      <button id="launch">Launch Workflow</button>
    </main>
    <script type="module" src="./app.js"></script>
  </body>
</html>
`;
  }

  private renderCss() {
    return `body { margin: 0; font-family: Georgia, serif; background: linear-gradient(180deg, #fff8f0, #f1e7db); color: #231b14; }
.shell { width: min(960px, calc(100% - 32px)); margin: 0 auto; padding: 72px 0; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.18em; color: #b4582d; font-size: 0.78rem; }
h1 { font-size: clamp(2.8rem, 8vw, 5rem); line-height: 0.96; margin: 0 0 16px; }
.meta { display: flex; gap: 16px; margin: 20px 0; }
button { background: #b4582d; color: white; border: none; border-radius: 999px; padding: 14px 20px; cursor: pointer; }`;
  }

  private renderJs(project: ProjectRecord) {
    return `document.getElementById("launch")?.addEventListener("click", () => {
  console.log("Launching project workflow for ${project.slug}");
});`;
  }
}
