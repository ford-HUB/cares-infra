import { Page, Request, expect, test as base } from '@playwright/test';

/** Invalid input must stop in the browser with the exact `site/src/validators` message, never reaching the API. */
export type Verdict = 'PASS' | 'FAIL';

export interface InputFixture {
  name: string;
  /** Accessible label (`<label htmlFor>`). */
  field: string;
  value: string;
  expected: Verdict;
  /** Exact message shown on FAIL. */
  message?: string;
}

/** Mirrors `site/src/constants/session.ts`. */
export const TOKEN_KEY = 'cares-admin-token';

const ok = (data: unknown, message?: string) => ({ ok: true, ...(message ? { message } : {}), data });
const fail = (message: string, errors?: { path: string; message: string }[]) => ({
  ok: false,
  message,
  ...(errors ? { errors } : {}),
});

export const envelope = { ok, fail };

interface ApiStub {
  method?: string;
  /** Pathname, without origin. */
  path: string | RegExp;
  status?: number;
  body: unknown;
}

interface PortalFixtures {
  apiCalls: Request[];
  /** Unstubbed calls get a 501 envelope. */
  stubApi: (...stubs: ApiStub[]) => void;
  /** Any entry means an XSS payload executed. */
  dialogs: string[];
  /** Seeds a session token and stubs `/auth/me` for protected routes. */
  signIn: (user?: Record<string, unknown>) => Promise<void>;
}

export const test = base.extend<PortalFixtures>({
  apiCalls: async ({}, use) => {
    await use([]);
  },

  stubApi: async ({ page, apiCalls }, use) => {
    const stubs: ApiStub[] = [];

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      apiCalls.push(req);
      const url = new URL(req.url());
      const stub = stubs.find(
        (s) =>
          (!s.method || s.method.toUpperCase() === req.method()) &&
          (typeof s.path === 'string' ? url.pathname === s.path : s.path.test(url.pathname)),
      );

      await route.fulfill({
        status: stub?.status ?? (stub ? 200 : 501),
        contentType: 'application/json',
        body: JSON.stringify(stub?.body ?? fail(`No stub for ${req.method()} ${url.pathname}`)),
      });
    });

    await use((...next) => {
      stubs.unshift(...next);
    });
  },

  dialogs: async ({ page }, use) => {
    const opened: string[] = [];
    page.on('dialog', async (dialog) => {
      opened.push(dialog.message());
      await dialog.dismiss();
    });
    await use(opened);
  },

  signIn: async ({ page, stubApi }, use) => {
    await use(async (user = {}) => {
      stubApi({
        method: 'GET',
        path: '/api/v1/auth/me',
        body: ok({
          user_id: 'user-test',
          email: 'admin@uclm.edu.ph',
          firstname: 'Test',
          lastname: 'Admin',
          role_type: 'ADMIN',
          is_protected: false,
          permissions: [],
          suspensions: [],
          ...user,
        }),
      });
      await page.addInitScript(
        ([key]) => sessionStorage.setItem(key, 'playwright-token'),
        [TOKEN_KEY],
      );
    });
  },
});

export { expect };

const fieldError = (page: Page, message: string) => page.getByText(message, { exact: true });

export const expectInputVerdict = async (
  page: Page,
  fixture: InputFixture,
  apiCalls: Request[],
  submitPath: string,
) => {
  const submitted = apiCalls.some((r) => new URL(r.url()).pathname === submitPath);

  if (fixture.expected === 'FAIL') {
    expect(fixture.message, `fixture "${fixture.name}" needs the expected message`).toBeTruthy();
    await expect(fieldError(page, fixture.message!)).toBeVisible();
    expect(submitted, `"${fixture.name}" reached ${submitPath} despite failing client validation`).toBe(false);
  } else {
    if (fixture.message) await expect(fieldError(page, fixture.message)).toHaveCount(0);
    await expect.poll(() => apiCalls.some((r) => new URL(r.url()).pathname === submitPath)).toBe(true);
  }
};

/** react-hot-toast: the portal's channel for server errors. */
export const expectToast = async (page: Page, message: string) => {
  await expect(page.getByRole('status').filter({ hasText: message })).toBeVisible();
};
