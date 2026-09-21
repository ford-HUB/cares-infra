/**
 * The page GCash and Xendit's hosted checkout land on once the donor is done.
 * There is nothing to do here but send them back to the app, which is already
 * polling the payment status.
 */
export function renderPaymentReturnPage(success: boolean): string {
  const title = success ? 'Payment received' : 'Payment not completed';
  const body = success
    ? 'Thank you! You can close this page and return to the CARES app to see your donation.'
    : 'The payment was cancelled or did not go through. Return to the CARES app to try again.';
  const colour = success ? '#1F5F28' : '#B3261E';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · CARES</title>
<style>
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #F3F8F4; color: #1F2A22; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
  .card { background: #fff; border: 1px solid #D9E7DC; border-radius: 20px; padding: 32px 28px; max-width: 420px; width: 100%; text-align: center; }
  .mark { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; background: ${colour}1A; color: ${colour}; font-size: 30px; font-weight: 700; }
  h1 { font-size: 20px; margin: 0 0 10px; color: ${colour}; }
  p { font-size: 15px; line-height: 1.5; margin: 0; color: #4B5A50; }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">${success ? '✓' : '!'}</div>
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}
