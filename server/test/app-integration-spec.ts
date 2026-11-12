import { envelope, expect, test } from './config/portal-validation';

/**
 * Entry check for the Playwright toolchain. It owns no form — it proves the
 * portal boots and every `/api/**` call is intercepted, so a red module spec
 * is about the form, never the setup or a live backend.
 */
test.describe('app — integration toolchain', () => {
  test('portal renders the login form', async ({ page, stubApi }) => {
    stubApi();
    await page.goto('/login');
    await expect(page.getByLabel('Email', { exact: false }).first()).toBeVisible();
  });

  test('unstubbed API calls never reach a server', async ({ page, stubApi, apiCalls }) => {
    stubApi();
    await page.goto('/login');

    const res = await page.evaluate(async () => {
      const r = await fetch('/api/v1/app-probe');
      return { status: r.status, body: await r.json() };
    });

    expect(res.status).toBe(501);
    expect(res.body.ok).toBe(false);
    expect(apiCalls.map((r) => new URL(r.url()).pathname)).toContain('/api/v1/app-probe');
  });

  test('stubs answer in the server envelope', async ({ page, stubApi }) => {
    stubApi({ method: 'GET', path: '/api/v1/app-probe', body: envelope.ok({ ready: true }) });
    await page.goto('/login');

    const body = await page.evaluate(async () => (await fetch('/api/v1/app-probe')).json());
    expect(body).toEqual({ ok: true, data: { ready: true } });
  });

  test('signIn seeds the session token', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/login');
    const token = await page.evaluate(() => sessionStorage.getItem('cares-admin-token'));
    expect(token).toBe('playwright-token');
  });
});
