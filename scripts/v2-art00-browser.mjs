import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const sha256 = value => createHash("sha256").update(value).digest("hex");
const browser = await chromium.launch({ headless: true });

async function qualify({ width, height }) {
  const page = await browser.newPage({ viewport: { width, height } });
  const source = resolve(`artifacts/v2-art00-proof-${width}.svg`);
  await page.goto(pathToFileURL(source).href);
  await page.waitForSelector("svg");

  const base = await page.evaluate(() => {
    const svg = document.querySelector("svg");
    const ring = document.querySelector(".phase-ring");
    if (!(svg instanceof SVGSVGElement) || !(ring instanceof SVGElement)) throw new Error("V2 ART proof structure missing.");
    const rect = svg.getBoundingClientRect();
    const style = getComputedStyle(ring);
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      animationName: style.animationName,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      fxCount: document.querySelectorAll(".fx-shift,.fx-spawn,.fx-hit,.fx-death").length,
    };
  });

  if (base.width !== width || base.height !== height) throw new Error(`Unexpected SVG viewport ${base.width}x${base.height}.`);
  if (base.scrollWidth > width || base.scrollHeight > height) throw new Error(`Proof overflows viewport at ${width}px.`);
  if (base.animationName === "none") throw new Error("Motion proof animation is not active.");
  if (base.fxCount !== 4) throw new Error(`Expected four FX grammar samples, got ${base.fxCount}.`);

  const initial = await page.screenshot({ path: `artifacts/v2-art00-${width}-initial.png` });
  await page.waitForTimeout(220);
  const motion = await page.screenshot({ path: `artifacts/v2-art00-${width}-motion.png` });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(30);
  const reduced = await page.evaluate(() => {
    const ring = document.querySelector(".phase-ring");
    if (!(ring instanceof SVGElement)) throw new Error("Reduced-motion ring missing.");
    return getComputedStyle(ring).animationName;
  });
  if (reduced !== "none") throw new Error(`Reduced motion did not disable animation: ${reduced}.`);
  const reducedShot = await page.screenshot({ path: `artifacts/v2-art00-${width}-reduced.png` });

  const initialSha = sha256(initial);
  const motionSha = sha256(motion);
  const reducedSha = sha256(reducedShot);
  if (initialSha === motionSha) throw new Error(`Motion proof did not visually change at ${width}px.`);

  console.log(`V2_ART_00_${width}_INITIAL_SHA256=${initialSha}`);
  console.log(`V2_ART_00_${width}_MOTION_SHA256=${motionSha}`);
  console.log(`V2_ART_00_${width}_REDUCED_SHA256=${reducedSha}`);
  console.log(`V2_ART_00_${width}_VIEWPORT=PASS`);
  await page.close();
}

try {
  await qualify({ width: 960, height: 640 });
  await qualify({ width: 390, height: 844 });
  console.log("V2_ART_00_MOTION_BROWSER=PASS");
} finally {
  await browser.close();
}
