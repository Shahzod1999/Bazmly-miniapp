// Backend'ni Playwright'da `page.route` orqali almashtirish (faqat testlar uchun).
import type { Page, Route } from "@playwright/test";
import { tokens, user } from "./data";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export interface MockResponse {
  status?: number;
  body?: unknown;
}
type Handler = MockResponse | ((route: Route, body: unknown) => MockResponse);
export type Handlers = Record<string, Handler>;

export interface ApiLog {
  calls: { method: string; path: string; body: unknown }[];
  find: (key: string) => { method: string; path: string; body: unknown } | undefined;
}

/**
 * `handlers` kaliti: "GET /api/v1/venues/search". Oxiriga `*` qo'yilsa prefiks bo'yicha mos keladi.
 * Ro'yxatda yo'q so'rovlar 404 qaytaradi — soxta muvaffaqiyat bo'lmasligi uchun.
 */
export async function mockApi(page: Page, handlers: Handlers): Promise<ApiLog> {
  const calls: ApiLog["calls"] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method() as Method;
    let body: unknown = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = request.postData();
    }
    calls.push({ method, path: url.pathname, body });
    const key = `${method} ${url.pathname}`;
    const match =
      handlers[key] ??
      Object.entries(handlers).find(([pattern]) => pattern.endsWith("*") && key.startsWith(pattern.slice(0, -1)))?.[1];
    const res: MockResponse = typeof match === "function" ? match(route, body) : match ?? { status: 404, body: { detail: "Topilmadi" } };
    await route.fulfill({
      status: res.status ?? 200,
      contentType: "application/json",
      body: res.body === undefined ? "" : JSON.stringify(res.body),
    });
  });
  return { calls, find: (key) => calls.find((c) => `${c.method} ${c.path}` === key) };
}

/** Telegram SDK skriptini almashtirish. `initData` berilsa ilova Telegram ichida ochilgan deb hisoblaydi. */
export async function mockTelegram(page: Page, initData: string | null = null): Promise<void> {
  const script = initData
    ? `window.Telegram = { WebApp: {
        initData: ${JSON.stringify(initData)},
        initDataUnsafe: {}, version: "8.0", platform: "ios", colorScheme: "light", themeParams: {},
        viewportHeight: 800, viewportStableHeight: 800, safeAreaInset: {top:0,bottom:0,left:0,right:0},
        contentSafeAreaInset: {top:0,bottom:0,left:0,right:0}, isExpanded: true,
        ready(){}, expand(){}, isVersionAtLeast(){ return true; }, close(){}, disableVerticalSwipes(){}, setHeaderColor(){}, setBackgroundColor(){},
        onEvent(){}, offEvent(){}, openLink(){}, openTelegramLink(){}, requestContact(){},
        HapticFeedback: { impactOccurred(){}, notificationOccurred(){}, selectionChanged(){} },
        BackButton: { isVisible:false, show(){}, hide(){}, onClick(){}, offClick(){} },
        MainButton: { text:"", isVisible:false, isActive:true, isProgressVisible:false, setText(){}, setParams(){}, show(){}, hide(){},
          enable(){}, disable(){}, showProgress(){}, hideProgress(){}, onClick(){}, offClick(){} }
      } };`
    : "";
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: script })
  );
}

/** Kirgan foydalanuvchi holati: tokenlar localStorage'da, `/users/me` foydalanuvchini qaytaradi */
export async function signIn(page: Page): Promise<Handlers> {
  await page.addInitScript((t) => {
    localStorage.setItem("bazmly_access_token", t.access_token);
    localStorage.setItem("bazmly_refresh_token", t.refresh_token);
  }, tokens);
  return {
    "GET /api/v1/users/me": { body: user },
    "GET /api/v1/notifications/unread-count": { body: { unread: 0 } },
    "GET /api/v1/favorites": { body: [] },
  };
}
