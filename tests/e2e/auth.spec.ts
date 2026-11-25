import { expect, test } from "@playwright/test";
import { page as pageOf, tokens, user } from "../fixtures/data";
import { mockApi, mockTelegram } from "../fixtures/mock-api";

test("Telegram initData bilan avtomatik kirish", async ({ page }) => {
  await mockTelegram(page, "query_id=AAA&user=%7B%22id%22%3A1%7D&hash=abc");
  const api = await mockApi(page, {
    "POST /api/v1/auth/telegram": { body: tokens },
    "GET /api/v1/users/me": { body: user },
    "GET /api/v1/notifications/unread-count": { body: { unread: 0 } },
    "GET /api/v1/venues/search": { body: pageOf([]) },
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sozlamalar" })).toBeVisible();
  await expect(page.getByText("Aziz Karimov")).toBeVisible();
  expect(api.find("POST /api/v1/auth/telegram")?.body).toMatchObject({ init_data: expect.stringContaining("hash=abc") });
});

test("ro'yxatdan o'tish xatosi — muvaffaqiyat ko'rsatilmaydi", async ({ page }) => {
  await mockTelegram(page);
  await mockApi(page, {
    "POST /api/v1/auth/phone-check": { body: { phone: "+998901234567", registered: false, password_required: false } },
    "POST /api/v1/auth/register": { status: 409, body: { message: "Bu raqam allaqachon ro'yxatdan o'tgan" } },
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /Keyingisi/ }).click();
  await page.getByRole("button", { name: "Mijoz uchun akkaunt" }).click();
  await page.getByLabel("Telefon raqami").fill("901234567");
  await page.getByRole("button", { name: "Davom etish", exact: true }).click();
  await page.getByLabel("Ism va familiya").fill("Aziz Karimov");
  await page.getByLabel("Parol").fill("parol12345");
  await page.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(page.getByText("Bu raqam allaqachon ro'yxatdan o'tgan")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sozlamalar" })).toHaveCount(0);
});
