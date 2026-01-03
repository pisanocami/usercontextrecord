import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log("⚠️  Note: This script captures public screens only.");
  console.log("   For authenticated screens, use manual capture or provide session cookies.\n");

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

  const publicScreens = manifest.screens.filter((s) => !s.requiresAuth);
  const authScreens = manifest.screens.filter((s) => s.requiresAuth);

  console.log(`📸 Capturing ${publicScreens.length} public screens...\n`);

  for (const screen of publicScreens) {
    try {
      const url = `${BASE_URL}${screen.route}`;
      console.log(`  → ${screen.name} (${url})`);

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
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

  console.log("\n✨ Public screenshot capture complete!");
  console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);

  if (authScreens.length > 0) {
    console.log(`\n📋 Manual capture required for ${authScreens.length} authenticated screens:`);
    for (const screen of authScreens) {
      console.log(`   - ${screen.screenshotFile}: ${screen.name}`);
    }
    console.log("\n   To capture these screens:");
    console.log("   1. Log in to the application in your browser");
    console.log("   2. Navigate to each screen");
    console.log("   3. Take screenshots (1440x900 viewport recommended)");
    console.log(`   4. Save to: ${SCREENSHOTS_DIR}/`);
  }
}

captureScreenshots().catch(console.error);
