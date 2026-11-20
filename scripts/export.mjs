import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const score = JSON.parse(readFileSync(0, "utf8"));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({ viewport: { width: 681, height: 980 } });
  await page.goto(process.argv[2] + "/print.html");
  await page.waitForFunction(() => typeof window.printScore === "function");
  await page.evaluate((s) => window.printScore(s), score);
  await page.evaluate(() => document.fonts.ready);
  process.stdout.write(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  );
} finally {
  await browser.close();
}
