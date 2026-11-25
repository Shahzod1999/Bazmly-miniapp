import { expect, test } from "@playwright/test";
import { hallBooking } from "../fixtures/data";
import { mockApi, mockTelegram, signIn } from "../fixtures/mock-api";

test("payment-success to'lanmagan bronni 'to'landi' deb ko'rsatmaydi", async ({ page }) => {
  await mockTelegram(page);
  const base = await signIn(page);
  await mockApi(page, { ...base, "GET /api/v1/bookings/88": { body: hallBooking } });
  await page.goto("/payment-success?bookingId=88");
  await expect(page).toHaveURL(/\/payment\/88$/);
  await expect(page.getByText(/to'lov kutilmoqda/)).toBeVisible();
  await expect(page.getByText(/To'lov muvaffaqiyatli/i)).toHaveCount(0);
});

test("payment-success bookingId'siz chiptalarga yo'naltiradi", async ({ page }) => {
  await mockTelegram(page);
  const base = await signIn(page);
  await mockApi(page, { ...base, "GET /api/v1/bookings": { body: [] } });
  await page.goto("/payment-success");
  await expect(page).toHaveURL(/\/tickets$/);
});
