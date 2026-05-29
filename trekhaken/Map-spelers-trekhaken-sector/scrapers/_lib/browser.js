/**
 * browser.js — Gedeelde Playwright browser launcher.
 * Headless Chromium met nederlandse UA + reasonable defaults.
 */
import { chromium } from "playwright";

export async function launchBrowser({ headless = true } = {}) {
  const browser = await chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    locale: "nl-BE",
    timezoneId: "Europe/Brussels",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });
  return { browser, context };
}

export async function newPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  return page;
}
