import { expect, test } from "@playwright/test";

test("Schnellanmeldung mit Demo-Knöpfen", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByText("Test-Umgebung – Demo-Zugang eintragen:")).toBeVisible();
  await page.getByRole("button", { name: /Lorina/ }).click();
  await expect(page.getByLabel("E-Mail")).toHaveValue("lorina@kindkesmoeoen.test");
  await page.getByRole("button", { name: "Marielena" }).click();
  await expect(page.getByLabel("E-Mail")).toHaveValue("marielena@kindkesmoeoen.test");
  if (process.env.SCREENSHOT_ORDNER) await page.screenshot({ path: `${process.env.SCREENSHOT_ORDNER}/${info.project.name}-0-login.png` });
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Marielena/ })).toBeVisible();
});
