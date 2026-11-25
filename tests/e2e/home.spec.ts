import { expect, test, type Page } from "@playwright/test";
import { hallItem, page as pageOf, restaurantItem } from "../fixtures/data";
import { mockApi, mockTelegram, signIn, type Handlers } from "../fixtures/mock-api";

async function setup(page: Page, handlers: Handlers) {
  await mockTelegram(page);
  const base = await signIn(page);
  return mockApi(page, { ...base, "GET /api/v1/geo/regions": { body: [] }, "GET /api/v1/users/me/recent-locations": { body: [] }, "GET /api/v1/notifications": { body: pageOf([]) }, ...handlers });
}

test("bosh sahifa API'dan kelgan joylarni ko'rsatadi", async ({ page }) => {
  await setup(page, { "GET /api/v1/venues/search": { body: pageOf([restaurantItem, hallItem]) } });
  await page.goto("/");
  await expect(page.getByText("Afsona restorani")).toBeVisible();
  await expect(page.getByText("Navro'z to'yxonasi")).toBeVisible();
});

test("bo'sh natija holati", async ({ page }) => {
  await setup(page, { "GET /api/v1/venues/search": { body: pageOf([]) } });
  await page.goto("/");
  await expect(page.getByText("Mos keluvchi muassasa topilmadi")).toBeVisible();
});

test("xato holati va qayta urinish", async ({ page }) => {
  let fail = true;
  await setup(page, {
    "GET /api/v1/venues/search": () => (fail ? { status: 500, body: { message: "Server xatosi" } } : { body: pageOf([restaurantItem]) }),
  });
  await page.goto("/");
  await expect(page.getByText("Joylarni yuklab bo'lmadi")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Qayta urinish" }).click();
  await expect(page.getByText("Afsona restorani")).toBeVisible();
});

test("/admin mavjud emas (404)", async ({ page }) => {
  await mockTelegram(page);
  await mockApi(page, {});
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Sahifa topilmadi")).toBeVisible();
});
