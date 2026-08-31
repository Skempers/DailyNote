import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function run(name, viewport, fn) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await fn(page);
  await page.close();
}

try {
  await run("desktop", { width: 1440, height: 900 }, async (page) => {
    await page.locator("#demo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "/workspace/screenshots/qa-landing-half.png" });

    await page.getByRole("button", { name: "一周", exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/workspace/screenshots/qa-landing-week.png" });

    await page.getByRole("button", { name: "一月", exact: true }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "8月", exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/workspace/screenshots/qa-landing-month.png" });

    const cell = page.locator("button[data-date='2024-08-24']").first();
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(500);
    const journal = page.locator("#journal");
    await journal.waitFor({ timeout: 5000 });
    await page.screenshot({ path: "/workspace/screenshots/qa-day-focus.png" });

    await journal.click();
    await journal.press("End");
    await journal.type("\n\n实时保存测试：这一段会马上出现在格子里。", { delay: 8 });
    await page.waitForTimeout(1400);

    const body = await journal.inputValue();
    if (!body.includes("实时保存测试")) throw new Error("journal did not accept text");

    await page.getByRole("button", { name: "收起" }).first().click();
    await page.waitForTimeout(700);

    const cellText = await page.locator("button[data-date='2024-08-24']").innerText();
    if (!cellText.includes("实时保存测试")) {
      throw new Error(`cell did not fill with journal: ${cellText.slice(0, 240)}`);
    }
    await page.screenshot({ path: "/workspace/screenshots/qa-cell-filled.png" });
  });

  await run("mobile", { width: 390, height: 844 }, async (page) => {
    await page.locator("#demo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "一月", exact: true }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "8月", exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "/workspace/screenshots/qa-mobile-month.png" });
    const cell = page.locator("button[data-date='2024-08-24']").first();
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "/workspace/screenshots/qa-mobile-focus.png" });
  });

  console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
  if (errors.length) process.exit(1);
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
