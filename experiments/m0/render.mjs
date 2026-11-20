import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
  const names = process.argv.slice(2);
  for (const name of names.length ? names : ["crossings", "placement", "rhythm", "low", "annotated"]) {
    const page = await browser.newPage({ viewport: { width: 760, height: 800 } });
    const caption = name === "annotated" ? "<h1>Four strings · First position</h1><p>Letter = string · Number = finger · Letter alone = open string<br>Low and high describe finger placement within first position.</p>" : "";
    await page.setContent('<style>@page {size:A4;margin:14mm}body{font:16px Georgia;margin:0}h1{font-size:24px}#score{width:680px}</style>' + caption + '<div id="score"></div>');
    await page.addScriptTag({path: require.resolve("opensheetmusicdisplay")});
    await page.evaluate(async xml => {
      const score = new opensheetmusicdisplay.OpenSheetMusicDisplay("score", {drawTitle:false, autoResize:false, renderSingleHorizontalStaffline:false});
      await score.load(xml);
      score.render();
      await document.fonts.ready;
    }, readFileSync(`.work/${name}.musicxml`, "utf8"));
    await page.pdf({path:`.work/${name}.pdf`, preferCSSPageSize:true});
    await page.close();
  }
} finally { await browser.close(); }
