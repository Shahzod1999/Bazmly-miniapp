import { expect, test, type Page } from "@playwright/test";
import { freeTables, myBookings, restaurantDetail, tableBooking } from "../fixtures/data";
import { mockApi, mockTelegram, signIn, type Handlers } from "../fixtures/mock-api";

async function setup(page: Page, extra: Handlers) {
  await mockTelegram(page);
  const base = await signIn(page);
  return mockApi(page, {
    ...base,
    "GET /api/v1/venues/10": { body: restaurantDetail },
    "GET /api/v1/venues/10/tables": { body: freeTables },
    ...extra,
  });
}

async function fillTableForm(page: Page) {
  await page.goto("/booking/10");
  await page.getByRole("button", { name: /^(Dush|Sesh|Chor|Pay|Jum|Shan|Yak)\s*\d+$/ }).nth(1).click();
  await page.getByRole("button", { name: /^\d\d:\d\d$/ }).first().click();
  await page.getByRole("button", { name: /^4-stol/ }).click();
  await page.getByRole("button", { name: "Keyingisi" }).click();
  await page.getByRole("button", { name: "Tasdiqlash va davom etish" }).click();
  await page.getByRole("button", { name: "Bron qilish" }).click();
}

test("stol bron qilish — muvaffaqiyatli", async ({ page }) => {
  const api = await setup(page, { "POST /api/v1/bookings/table": { status: 201, body: tableBooking } });
  await fillTableForm(page);
  await expect(page.getByText("BZ-77").first()).toBeVisible();
  await expect(page.getByText("Tasdiq kutilmoqda")).toBeVisible();
  expect(api.find("POST /api/v1/bookings/table")?.body).toMatchObject({ venue_id: 10, table_id: 101, guests_count: 2 });
});

test("stol bron qilish — API xatosi, soxta chipta yo'q", async ({ page }) => {
  await setup(page, { "POST /api/v1/bookings/table": { status: 409, body: { message: "Bu stol band qilingan" } } });
  await fillTableForm(page);
  await expect(page.getByRole("alert").filter({ hasText: "Bu stol band qilingan" })).toBeVisible();
  await expect(page.getByText("BZ-77")).toHaveCount(0);
});

test("chiptalar ro'yxati API'dan", async ({ page }) => {
  await setup(page, { "GET /api/v1/bookings": { body: myBookings } });
  await page.goto("/tickets");
  await expect(page.getByText("Afsona restorani")).toBeVisible();
  await expect(page.getByText(/4-stol/)).toBeVisible();
});
