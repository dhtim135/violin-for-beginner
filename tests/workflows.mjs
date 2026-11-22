// Runs against an isolated local library. Starts and stops its own server.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
mkdirSync(".runtime", { recursive: true });
const dir = mkdtempSync(".runtime/test-");
// Original dense score exercises triplets, print spacing and local-only editions.
const row = { example: "test-arpeggios", title: "Triplet arpeggios", titleZh: "三连音练习",
  composer: "Stringbook test fixture", aliases: "", section: "Studies" };
const bars = Array.from({ length: 24 }, (_, bar) => ({
  meter: "4/4", events: [71, 69, 67, 66, 67, 69, 71, 74, 78].map((pitch, i) => ({
    id: `study-${bar}-${i}`, pitch, ticks: i < 3 ? 32 : 48, tie: false, flag: "", fingering: null,
  })),
}));
writeFileSync(dir + "/private-editions.json", JSON.stringify({ [row.example]: {
  row, score: { title: row.title, titleZh: row.titleZh, source: row.composer,
    key: "G", part: "Violin", kind: "example", bpm: 76, notices: [], bars },
} }));
const socket = net.createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((ok) => socket.close(ok));
const url = "http://127.0.0.1:" + port;
const server = spawn("./scripts/start.sh", [], {
  env: { ...process.env, PORT: String(port), VIOLIN_DATA: dir },
  stdio: ["ignore", "ignore", "inherit"],
});
let browser;
try {
  for (let i = 0; i < 100; i++) {
    if (
      await fetch(url + "/api/example")
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await new Promise((ok) => setTimeout(ok, 200));
  }
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_BIN ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1300, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.route("**/legacy-entry", (route) => route.fulfill({
    contentType: "text/html",
    body: '<script type="module" src="/app.js"></script>',
  }));
  await page.goto(url + "/legacy-entry", { waitUntil: "commit" });
  await page.waitForURL("**/index.html?ui=*");
  await page.waitForSelector("[data-note]");
  // A returning tab can have stale unversioned scripts/styles. Both menus
  // must also work as ordinary forms before the enhanced controls start.
  const staleRequests = [];
  const legacyAsset = /^\/(?:app\.js|music\.js|keys\.js|player\.js|style\.css)$/;
  await page.route((url) => legacyAsset.test(url.pathname), (route) => {
    staleRequests.push(route.request().url());
    return route.abort();
  });
  await page.route("**/ui/*/app.js", (route) => route.abort(), { times: 2 });
  await page.goto(url + "/index.html");
  await page.locator("#bootError").waitFor();
  await page.click("#switchPiece");
  const catalogue = await (await fetch(url + "/api/starters")).json();
  const choices = page.locator("#starterChoices");
  assert.deepEqual(await choices.locator("button").evaluateAll(items => items.map(item => item.value)),
    catalogue.map(item => item.example));
  const groups = await choices.locator("fieldset").evaluateAll(items => items.map(group => ({
    name: group.querySelector("legend").textContent,
    titles: [...group.querySelectorAll("button")].map(button => button.firstChild.textContent.trim()),
  })));
  for (const { titles } of groups) {
    assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b, "en")));
  }
  await page.getByRole("button", { name: /Baa, Baa, Black Sheep.*咩咩黑绵羊.*Open G/ }).waitFor();
  await page.getByRole("button", { name: /Triplet arpeggios/ }).click();
  await page.locator("#bootError").waitFor();
  assert.match(await page.textContent("#title"), /Triplet arpeggios/);
  assert.match(await page.textContent("#key"), /G major/);
  await page.click("#key");
  await page.locator("#keyPanel").getByRole("button", { name: "D major", exact: true }).click();
  await page.waitForSelector("[data-note]");
  assert.match(await page.textContent("#key"), /D major/);
  assert.match(await page.locator("[data-note]").first().getAttribute("aria-label"), /^F♯[45]/);
  assert.equal(await page.textContent("#barcount"), "24 bars");
  assert.equal(await page.locator(".abcjs-triplet").count(), 24);
  // Dense fingerings must line up with their noteheads at both reading sizes.
  for (const width of [390, 1300]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction((small) => {
      const caption = document.querySelector(".bar-range")?.textContent;
      return small ? caption === "Bar 1" : caption?.startsWith("Bars 1–");
    }, width === 390);
    const layout = await page.locator("#notation").evaluate((paper) => {
      let labelCount = 0;
      let smallestGap = Infinity;
      let largestOffset = 0;
      let smallestFill = 1;
      let baselineDrift = 0;
      for (const row of paper.querySelectorAll(".staff")) {
        const staff = row.querySelector(".abcjs-staff").getBoundingClientRect();
        smallestFill = Math.min(smallestFill, staff.width / row.clientWidth);
        let right = -Infinity;
        let baseline;
        for (const label of row.querySelectorAll(".abcjs-lyric")) {
          const box = label.getBoundingClientRect();
          const head = label.closest("[data-note]").querySelector(".abcjs-notehead").getBoundingClientRect();
          largestOffset = Math.max(largestOffset, Math.abs((box.left + box.right - head.left - head.right) / 2));
          smallestGap = Math.min(smallestGap, box.left - right);
          baseline ??= box.bottom;
          baselineDrift = Math.max(baselineDrift, Math.abs(baseline - box.bottom));
          right = box.right;
          labelCount++;
        }
      }
      return { labelCount, smallestGap, largestOffset, smallestFill, baselineDrift };
    });
    assert.equal(layout.labelCount, 216);
    assert.ok(layout.smallestGap >= 2, JSON.stringify(layout));
    assert.ok(layout.largestOffset < 1 && layout.baselineDrift < 1, JSON.stringify(layout));
    assert.ok(layout.smallestFill > 0.9, JSON.stringify(layout));
  }
  assert.deepEqual(staleRequests, []);
  // A slow saved library must not block either picker.
  let releaseLibrary;
  const libraryGate = new Promise((resolve) => {
    releaseLibrary = resolve;
  });
  await page.route("**/api/library", async (route) => {
    await libraryGate;
    await route.continue();
  }, { times: 1 });
  await page.goto(url);
  await page.waitForSelector("[data-note]");
  await page.click("#switchPiece");
  await page.getByRole("button", { name: /Triplet arpeggios/ }).click();
  await page.waitForFunction(() =>
    document.querySelector("#title").textContent.includes("Triplet arpeggios"),
  );
  await page.click("#key");
  await page
    .locator("#keyPanel")
    .getByRole("button", { name: "D major", exact: true })
    .click();
  assert.match(await page.textContent("#key"), /D major/);
  releaseLibrary();
  await page.reload();
  await page.waitForSelector("[data-note]");
  assert.equal(await page.locator("[data-note]").count(), 42);
  await page.screenshot({ path: dir + "/desktop.png" });
  assert.ok((await page.locator(".paper").boundingBox()).width > 1100);
  await page.click("#switchPiece");
  await page.getByRole("button", { name: /Frère Jacques.*两只老虎/ }).click();
  await page.waitForFunction(
    () => document.querySelector("#title").textContent === "Frère Jacques 两只老虎",
  );
  await page.click("#key");
  await page
    .locator("#keyPanel")
    .getByRole("button", { name: "A major", exact: true })
    .click();
  assert.match(
    await page.locator("[data-note]").first().getAttribute("aria-label"),
    /^A[34] ·/,
  );
  await page.click("#undo");
  assert.match(await page.textContent("#key"), /D major/);
  await page.click("#key");
  await page
    .locator("#keyPanel")
    .getByRole("button", { name: "A major", exact: true })
    .click();
  await page.locator("[data-note]").first().click();
  await page.selectOption("#pitch", "69");
  await page.selectOption("#finger", "D");
  await page.click("#edit button.primary");
  assert.match(await page.locator("#selection").textContent(), /A4 · D4/);
  await page.uncheck("#count");
  await page.check("#loop");
  await page.fill("#last", "2");
  await page.fill("#first", "2");
  await page.selectOption("#speed", "1.25");
  const playButton = page.locator("#play");
  const resetButton = page.getByRole("button", { name: "Reset", exact: true });
  const loopNotes = (await page.locator("[data-note]").evaluateAll(
    nodes => nodes.map(node => node.dataset.note),
  )).slice(4, 8);
  const waitForNote = id => page.waitForSelector(`[data-note="${id}"].playing`);
  assert.ok(await resetButton.isDisabled());
  await playButton.click();
  await waitForNote(loopNotes[1]);
  await page.getByRole("button", { name: /Pause/ }).click();
  await page.getByRole("button", { name: /Resume/ }).waitFor();
  await page.waitForTimeout(850); // Longer than one note at this speed.
  assert.equal(await page.locator(".playing").getAttribute("data-note"), loopNotes[1]);
  await playButton.click();
  const nextNote = await page.waitForFunction(pausedId => {
    const id = document.querySelector(".playing")?.dataset.note;
    return id && id !== pausedId ? id : false;
  }, loopNotes[1]);
  assert.equal(await nextNote.jsonValue(), loopNotes[2]);
  await resetButton.click();
  assert.equal(await page.locator(".playing").count(), 0);
  assert.ok(await resetButton.isDisabled());
  await playButton.click();
  await waitForNote(loopNotes[0]);
  await playButton.click();
  await resetButton.click();
  assert.ok(await resetButton.isDisabled());
  await page.check("#count");
  await playButton.click();
  await page.getByRole("button", { name: /Pause/ }).click();
  await page.getByRole("button", { name: /Resume/ }).waitFor();
  assert.equal(await page.locator(".playing").count(), 0);
  await playButton.click();
  await waitForNote(loopNotes[0]);
  await resetButton.click();
  await page.click("#save");
  await page.waitForFunction(() =>
    document.querySelector("#save").textContent.includes("Saved"),
  );
  await page.reload();
  await page.click("#switchPiece");
  await page.locator("#savedChoices").getByRole("button", { name: /Frère Jacques.*两只老虎/ }).click();
  await page.waitForSelector('[aria-label="A4 · D4"]');
  assert.match(await page.textContent("#key"), /A major/);
  const d = page.waitForEvent("download");
  await page.click("#export");
  await (await d).saveAs(dir + "/edited.pdf");
  assert.ok(
    execFileSync("pdftotext", [dir + "/edited.pdf", "-"], {
      encoding: "utf8",
    }).includes("D4"),
  );
  assert.match(
    execFileSync("pdftotext", [dir + "/edited.pdf", "-"], { encoding: "utf8" }),
    /A major/,
  );
  assert.match(execFileSync("pdftotext", [dir + "/edited.pdf", "-"], { encoding: "utf8" }).replace(/\s/g, ""), /两只老虎/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: dir + "/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1300, height: 900 });
  // Exercise every conversion through the normal file/search controls.
  for (const [kind, file] of [
    ["Image", "samples/rhythm.png"],
    ["PDF", "samples/placement.pdf"],
    ["Audio", "samples/melody.wav"],
    ["Search", null],
  ]) {
    await page.click("#import");
    await page.locator(".tabs button", { hasText: kind }).click();
    if (file) {
      await page.locator("input[type=file]").setInputFiles(file);
      if (kind === "PDF")
        await page.getByLabel("Pages to read", { exact: false }).fill("1");
      if (kind === "Audio") {
        await page.getByLabel("End (seconds", { exact: false }).fill("3.8");
        await page.getByLabel("Tempo in BPM", { exact: false }).fill("120");
      }
      await page.getByText("Generate suggested score", { exact: true }).click();
    } else {
      await page.getByLabel("Title or composer").fill("zzzz-no-such-title");
      await page.locator(".searchrow button").click();
      await page.getByText("No available score", { exact: false }).waitFor();
      await page.getByLabel("Title or composer").fill("Just for Today");
      await page.locator(".searchrow button").click();
      await page.locator("#dialog .sourceitem").first().click();
    }
    if (kind !== "Audio") {
      await page
        .getByText("Open annotated score", { exact: true })
        .waitFor({ timeout: 150000 });
      await page.getByText("Open annotated score", { exact: true }).click();
    }
    await page.waitForSelector("dialog[open]", {
      state: "hidden",
      timeout: 150000,
    });
    await page.waitForSelector("[data-note]");
    const title = await page.textContent("#title");
    assert.ok((await page.locator("[data-note]").count()) > 0);
    await page.click("#save");
    await page.waitForFunction(() =>
      document.querySelector("#save").textContent.includes("Saved"),
    );
    await page.click("#library");
    await page
      .locator("#dialog .sourceitem")
      .filter({ hasText: title })
      .first()
      .click();
    const download = page.waitForEvent("download");
    await page.click("#export");
    await (await download).saveAs(dir + "/" + kind + ".pdf");
    assert.ok(
      readFileSync(dir + "/" + kind + ".pdf")
        .subarray(0, 4)
        .equals(Buffer.from("%PDF")),
    );
    console.log(kind + " → " + title + " → save/reopen/PDF passed");
  }
  const saved = await (await fetch(url + "/api/library")).json();
  const snapshot = await (
    await fetch(url + "/api/library/" + saved[0].id)
  ).json();
  const commit = () =>
    fetch(url + "/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
  assert.equal((await commit()).status, 200);
  assert.equal((await commit()).status, 409);
  await page.click("#import");
  await page.locator(".tabs button", { hasText: "PDF" }).click();
  await page.locator("input[type=file]").setInputFiles("samples/placement.pdf");
  await page.getByLabel("Pages to read", { exact: false }).fill("99");
  await page.getByText("Generate suggested score", { exact: true }).click();
  await page.getByText("Page range does not fit", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByText("Generate suggested score", { exact: true })
      .isEnabled(),
    true,
  );
  await page.goto(url + "/?piece=starter");
  await page.waitForSelector("[data-note]");
  await page.check("#showBows");
  await page.click("#practice summary");
  await page.check("#fullScale");
  assert.match(await page.textContent(".scale-line"), /F♯/);
  assert.equal(await page.locator(".fingerboard tbody tr").count(), 4);
  assert.equal(await page.locator(".bow-group").count(), 4);
  const studyNotes = page.locator("#notation [data-note]");
  await studyNotes.nth(1).click();
  await page.click("#joinBow");
  assert.equal(await studyNotes.nth(1).getAttribute("data-stroke"), await studyNotes.nth(2).getAttribute("data-stroke"));
  assert.equal(await page.locator(".bow-group").count(), 3);
  await page.selectOption("#bowMode", "up");
  await page.click("#save");
  await page.waitForFunction(() => document.querySelector("#save").textContent.includes("Saved"));
  await page.click("#library");
  await page.locator("#dialog .sourceitem").filter({ hasText: "Twinkle, Twinkle" }).first().click();
  await studyNotes.nth(1).click();
  assert.equal(await page.inputValue("#bowMode"), "up");
  assert.equal(await studyNotes.nth(1).getAttribute("data-stroke"), await studyNotes.nth(2).getAttribute("data-stroke"));
  await page.click("#tools");
  await page.uncheck("#count");
  await page.click("#play");
  await page.waitForFunction(() => document.querySelectorAll(".bow-playing").length === 2);
  await page.click("#resetPlayback");
  assert.equal(await page.locator(".bow-playing").count(), 0);
  await page.click("#key");
  await page.locator('#keyPanel button').filter({ hasText: /^A major$/ }).click();
  assert.match(await page.textContent(".scale-line"), /G♯/);
  await page.click("#undo");
  await page.check("#printCard");
  const studyDownload = page.waitForEvent("download");
  await page.click("#export");
  await (await studyDownload).saveAs(dir + "/starter-bowing.pdf");
  const cardText = execFileSync("pdftotext", ["-layout", dir + "/starter-bowing.pdf", "-"], { encoding: "utf8" });
  assert.match(cardText, /Right hand · Bar 1/);
  assert.match(cardText, /One-octave scale/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#practice").scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.body.scrollWidth <= innerWidth));
  await page.screenshot({ path: dir + "/starter-card-mobile.png" });
  assert.deepEqual(errors, []);
  console.log("All browser workflows passed. Artifacts: " + dir);
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
