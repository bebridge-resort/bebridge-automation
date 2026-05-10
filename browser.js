const { chromium } = require('playwright');

// 브라우저를 매번 새로 열고, 사용 후 바로 닫음 (메모리 절약)
async function withBrowser(fn) {
  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process'],
    });
    const page = await (await browser.newContext({ locale:'ko-KR' })).newPage();
    return await fn(page);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { withBrowser };
