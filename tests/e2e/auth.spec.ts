import { expect, test } from "@playwright/test";
import { page as pageOf, tokens, user } from "../fixtures/data";
import { mockApi, mockTelegram } from "../fixtures/mock-api";

const INIT_DATA = "query_id=AAA&user=%7B%22id%22%3A1%7D&hash=abc";

test("birinchi ochilish: logo → tanishtiruv → til (3 ta) → Telegram orqali kirish", async ({ page }) => {
  await mockTelegram(page, INIT_DATA);
  await mockApi(page, {
    "POST /api/v1/auth/telegram": { body: tokens },
    "GET /api/v1/users/me": { body: user },
    "GET /api/v1/notifications/unread-count": { body: { unread: 0 } },
    "GET /api/v1/venues/search": { body: pageOf([]) },
  });
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Bazmly" }).last()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bazmlarni oson rejalashtiring" })).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "Ro‘yxatdan o‘tish" }).click();

  await expect(page.getByRole("heading", { name: "Tizim tilini tanlang" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(3);
  await page.getByRole("button", { name: "Davom etish" }).click();

  // Telegram initData bilan avtomatik kirilgan, telefon bor — ilovaning bosh sahifasi
  await expect(page.getByText(/Hayrli kun!/)).toBeVisible();
});

test("Telegram initData bilan avtomatik kirish (qayta ochilish)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bazmly-onboarded", "1"));
  await mockTelegram(page, INIT_DATA);
  const api = await mockApi(page, {
    "POST /api/v1/auth/telegram": { body: tokens },
    "GET /api/v1/users/me": { body: user },
    "GET /api/v1/notifications/unread-count": { body: { unread: 0 } },
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sozlamalar" })).toBeVisible();
  await expect(page.getByText("Aziz Karimov")).toBeVisible();
  expect(api.find("POST /api/v1/auth/telegram")?.body).toMatchObject({ init_data: expect.stringContaining("hash=abc") });
});

test("telefon raqami yo'q — Telegram kontaktini ulashish so'raladi", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bazmly-onboarded", "1"));
  await mockTelegram(page, INIT_DATA);
  await mockApi(page, {
    "POST /api/v1/auth/telegram": { body: tokens },
    "GET /api/v1/users/me": { body: { ...user, phone: null } },
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Akkaunt yaratish" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Telegram raqamini ulashish" })).toBeVisible();
});

test("Telegram'dan tashqarida faqat Telegram orqali kirish taklif qilinadi", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bazmly-onboarded", "1"));
  await mockTelegram(page);
  const api = await mockApi(page, {});
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Telegram orqali kiring" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /parol/i })).toHaveCount(0);
  expect(api.calls.filter((c) => c.path.includes("/auth/"))).toHaveLength(0);
});
