// Web smoke e2e over a real (local) stack: the same journeys as the Maestro
// flows in .maestro/. Creates one new account each run.
//
//   npx expo export --platform web   (with EXPO_PUBLIC_* pointing at the stack)
//   serve dist/ with an SPA fallback on BASE_URL, then:
//   BASE_URL=http://127.0.0.1:8088 CHROME_PATH=/path/to/chrome npm run e2e:web
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8088";
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  locale: "en-US",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: `fail-${results.length}.png` });
    throw e;
  }
};
const field = (label) =>
  page
    .locator(
      `input[aria-label="${label}"]:visible, textarea[aria-label="${label}"]:visible`,
    )
    .last();
const email = `e2e${Date.now()}@example.com`;
try {
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await step("disclaimer on sign-in", async () => {
    await page
      .getByText(/does not decide donor eligibility/)
      .waitFor({ timeout: 15000 });
  });
  await step("sign up", async () => {
    await page.getByText("Don't have an account? Sign up").click();
    await page.getByText("Create account").first().waitFor({ timeout: 10000 });
    await field("Email").fill(email);
    await field("Password").fill("Password123!");
    await page.getByRole("button", { name: "Continue" }).click();
  });
  await step("onboarding", async () => {
    await page.getByText("Tell us about you").waitFor({ timeout: 15000 });
    await page.getByText("Guardian", { exact: true }).click();
    await field("Your name").fill("E2E Guardian");
    await page.getByText("District", { exact: true }).first().click();
    await page.getByPlaceholder(/Search|খুঁজুন/).fill("Dhaka");
    await page
      .getByText(/^Dhaka$/)
      .first()
      .click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Request Blood").waitFor({ timeout: 15000 });
  });
  await step("learn → inheritance example banner", async () => {
    await page.getByText("Learn about thalassemia & carriers").click();
    await page.getByText("How inheritance works (example)").click();
    await page
      .getByText(
        "Educational example — not a personal medical/genetic risk assessment",
      )
      .waitFor({ timeout: 10000 });
  });
  await step("carrier × non-carrier shows 2 / 2 / 0", async () => {
    await page.getByText("Carrier × non-carrier").click();
    await page.getByText("2 of 4 boxes: Carrier").waitFor({ timeout: 5000 });
    await page
      .getByText("0 of 4 boxes: Thalassemia")
      .waitFor({ timeout: 5000 });
  });
  await step(
    "learn list says content is under review (nothing published)",
    async () => {
      await page.goto(`${BASE_URL}/learn`, { waitUntil: "networkidle" });
      await page
        .getByText("Articles are being reviewed")
        .waitFor({ timeout: 10000 });
    },
  );
  await step("community → new post shows guidelines gate", async () => {
    await page.goto(`${BASE_URL}/community`, { waitUntil: "networkidle" });
    await page
      .getByText(
        /Personal experience, not medical advice|Posts are personal experiences/,
      )
      .first()
      .waitFor({ timeout: 10000 });
    await page.getByText("New post", { exact: true }).first().click();
    await page.getByText("I accept the guidelines").waitFor({ timeout: 10000 });
  });
  await step(
    "accept guidelines → post → labelled personal experience",
    async () => {
      await page.getByText("I accept the guidelines").click();
      await field("Title").waitFor({ timeout: 10000 });
      await field("Title").fill("E2E first post");
      await field("Your experience or question").fill(
        "Sharing our family's experience.",
      );
      await page.getByRole("button", { name: "Publish" }).click();
      await page
        .locator("text=E2E first post >> visible=true")
        .first()
        .waitFor({ timeout: 10000 });
      await page
        .locator("text=Personal experience, not medical advice >> visible=true")
        .first()
        .waitFor({ timeout: 5000 });
    },
  );
  await step("directory shows verified-only notice", async () => {
    await page.goto(`${BASE_URL}/directory`, { waitUntil: "networkidle" });
    await page
      .getByText(/Only entries checked by our team/)
      .waitFor({ timeout: 10000 });
  });
} catch {
  // The failing step is already recorded in results.
}
console.log(results.join("\n"));
console.log("PAGE ERRORS:", errors);
await browser.close();
if (results.some((r) => r.startsWith("FAIL")) || errors.length > 0)
  process.exit(1);
