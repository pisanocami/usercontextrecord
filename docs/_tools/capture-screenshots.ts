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
  
  // Check if server is running
  console.log("🔍 Checking if server is running...");
  try {
    const response = await fetch('http://localhost:5000/api/auth/user');
    if (response.ok) {
      console.log("✅ Server is running and responding");
    }
  } catch (error) {
    console.log("❌ Server is not running or not accessible");
    console.log("   Please start the server first:");
    console.log("   - Make sure DATABASE_URL is set");
    console.log("   - npm run dev");
    console.log("   - or NODE_ENV=development tsx server/index.ts");
    console.log("   Then try again.\n");
    process.exit(1);
  }
  
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log("📁 Created screenshots directory");
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const publicScreens = manifest.screens.filter((s) => !s.requiresAuth);
  const authScreens = manifest.screens.filter((s) => s.requiresAuth);

  console.log(`📸 Capturing ${publicScreens.length} public screens...\n`);

  for (const screen of publicScreens) {
    try {
      const page: Page = await context.newPage();
      const url = `${BASE_URL}${screen.route}`;
      
      console.log(`  → ${screen.name} (${url})`);
      await page.goto(url, { waitUntil: "networkidle" });
      
      // Wait a bit more for any dynamic content
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(SCREENSHOTS_DIR, screen.screenshotFile);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      console.log(`    ✅ Saved: ${screen.screenshotFile}`);
      await page.close();
      
    } catch (error) {
      console.log(`    ❌ Error capturing ${screen.name}: ${(error as Error).message}`);
    }
  }

  console.log(`\n✨ Public screenshot capture complete!`);
  console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);

  if (authScreens.length > 0) {
    console.log(`\n📋 Manual capture required for ${authScreens.length} authenticated screens:`);
    authScreens.forEach((screen) => {
      console.log(`   - ${screen.screenshotFile}: ${screen.name}`);
    });
    console.log(`\n   To capture these screens:`);
    console.log(`   1. Log in to the application in your browser`);
    console.log(`   2. Navigate to each screen`);
    console.log(`   3. Take screenshots (1440x900 viewport recommended)`);
    console.log(`   4. Save to: ${SCREENSHOTS_DIR}`);
  }
  
  await browser.close();

  manifest.metadata.generated = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

captureScreenshots().catch(console.error);
