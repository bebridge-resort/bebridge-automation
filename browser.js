const { chromium } = require('playwright');
const sessions = {};

async function getPage(key) {
  try {
    if (sessions[key] && !sessions[key].isClosed()) return sessions[key];
  } catch {}
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
  });
  const page = await (await browser.newContext({ locale:'ko-KR' })).newPage();
  sessions[key] = page;
  return page;
}

async function resetPage(key) {
  try { await sessions[key]?.context()?.browser()?.close(); } catch {}
  delete sessions[key];
}

module.exports = { getPage, resetPage };
