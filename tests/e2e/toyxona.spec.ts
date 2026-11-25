import { expect, test } from "@playwright/test";
import { hallBooking, hallDetail, hallServices, page as pageOf } from "../fixtures/data";
import { mockApi, mockTelegram, signIn } from "../fixtures/mock-api";

test("to'yxona: sahifa → band qilish oynasi → bron", async ({ page }) => {
  await mockTelegram(page);
  const base = await signIn(page);
  const api = await mockApi(page, {
    ...base,
    "GET /api/v1/venues/20": { body: hallDetail },
    "GET /api/v1/venues/20/services": { body: hallServices },
    "GET /api/v1/venues/20/availability": { body: { venue_id: 20, dates: [] } },
    "GET /api/v1/favorites": { body: [] },
    "GET /api/v1/notifications": { body: pageOf([]) },
    "POST /api/v1/bookings/hall": { status: 201, body: hallBooking },
  });

  await page.goto("/toyxona/20");
  await expect(page.getByRole("heading", { name: "Navro'z to'yxonasi" })).toBeVisible();
  await page.getByRole("button", { name: /Band qilish/ }).first().click();

  await page.getByRole("button", { name: /-sana$/ }).nth(2).click();
  await page.getByRole("button", { name: /^\d\d:\d\d$/ }).first().click();
  await page.getByRole("button", { name: "Keyingisi" }).click();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Keyingisi" }).click();
  await page.getByRole("checkbox", { name: /Karnay-surnay/ }).click();
  await page.getByRole("button", { name: "Keyingisi" }).click();
  await page.getByRole("button", { name: "Band qilish", exact: true }).last().click();

  await expect(page.getByText("Bron yuborildi")).toBeVisible();
  await expect(page.getByText(/to‘lov kutilmoqda/)).toBeVisible();
  expect(api.find("POST /api/v1/bookings/hall")?.body).toMatchObject({ venue_id: 20, guests_count: 100, venue_service_ids: [301] });
});

test("to'yxona menyu paketlari — 'Tez orada' (endpoint yo'q)", async ({ page }) => {
  await mockTelegram(page);
  await mockApi(page, { "GET /api/v1/venues/20": { body: hallDetail } });
  await page.goto("/toyxona/20/menu");
  await expect(page.getByRole("heading", { name: "Tez orada" })).toBeVisible();
});
