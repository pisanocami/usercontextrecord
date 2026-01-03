import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const MANIFEST_PATH = path.join(__dirname, "screens-manifest.json");

interface Screen {
  id: string;
  name: string;
  route: string;
  section?: string;
  requiresAuth: boolean;
  description: string;
  technicalNotes: string;
  flow: string;
  screenshotFile: string;
}

interface Manifest {
  metadata: {
    title: string;
    version: string;
    generated: string;
    description: string;
  };
  screens: Screen[];
  flows: Record<string, { name: string; description: string }>;
  technicalArchitecture: Record<string, unknown>;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreenshots(): Promise<void> {
  console.log("🚀 Starting screenshot capture...\n");

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page: Page = await context.newPage();

  console.log(`📸 Capturing ${manifest.screens.length} screens...\n`);

  for (const screen of manifest.screens) {
    try {
      let url = `${BASE_URL}${screen.route}`;

      if (screen.route.includes(":id")) {
        url = `${BASE_URL}${screen.route.replace(":id", "1")}`;
      }

      console.log(`  → ${screen.name} (${url})`);

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

      if (screen.section) {
        await delay(500);
        const sectionButton = page.locator(`[data-testid="nav-${screen.section}"]`);
        if (await sectionButton.isVisible()) {
          await sectionButton.click();
          await delay(300);
        }
      }

      await delay(1000);

      const screenshotPath = path.join(SCREENSHOTS_DIR, screen.screenshotFile);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      console.log(`    ✅ Saved: ${screen.screenshotFile}`);
    } catch (error) {
      console.error(`    ❌ Error capturing ${screen.name}:`, error);
    }
  }

  await browser.close();

  manifest.metadata.generated = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log("\n✨ Screenshot capture complete!");
  console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

captureScreenshots().catch(console.error);
