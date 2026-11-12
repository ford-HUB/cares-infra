import { Page, Request, expect, test as base } from '@playwright/test';

/**
 * Fixtures and assertions shared by every Playwright spec in
 * `test/integration/modules/`. The point of these suites is the portal's own
 * validation: an invalid input must be stopped in the browser with the exact
 * message from `site/src/validators/*-schema.ts`, and must never reach the API.
 */
export type Verdict = 'PASS' | 'FAIL';

export interface InputFixture {
  name: string;
  /** Accessible label of the input, as rendered by `<label htmlFor>`. */
  field: string;
  value: string;
  expected: Verdict;
  /** Exact message the portal must show under the field when `expected` is FAIL. */
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
  /** Path after the origin, e.g. `/api/v1/auth/admin/login`. */
  path: string | RegExp;
  status?: number;
  body: unknown;
}

interface PortalFixtures {
  /** Every `/api/**` request the page made, in order. */
  apiCalls: Request[];
  /** Register canned responses; anything unstubbed gets a 501 envelope. */
  stubApi: (...stubs: ApiStub[]) => void;
  /** JS dialogs opened by the page — any entry means an XSS payload executed. */
  dialogs: string[];
  /** Puts a token in sessionStorage and stubs `/auth/me` so protected routes render. */
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

/** The error text rendered for a field, scoped to the field's container. */
const fieldError = (page: Page, message: string) => page.getByText(message, { exact: true });

/**
 * Asserts one input fixture after submit. FAIL → exact message visible and no
 * API call for `submitPath`. PASS → no message, and the request went out.
 */
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

/** A react-hot-toast message (the portal's channel for server-side errors). */
export const expectToast = async (page: Page, message: string) => {
  await expect(page.getByRole('status').filter({ hasText: message })).toBeVisible();
};
