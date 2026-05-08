require('dotenv').config();
const { getPage, resetPage } = require('./browser');
const ADMIN = 'https://bebridge.kr/manager_console_bebridge';
let adminOk = false;

async function loginAdmin() {
  const p = await getPage('homeAdmin');
  await p.goto(`${ADMIN}/index.php`);
  await p.waitForTimeout(1500);
  if (await p.locator('input[type="password"]').count() > 0) {
    await p.fill('input[name="id"], input[type="text"]', process.env.HOMEPAGE_ADMIN_ID);
    await p.fill('input[type="password"]', process.env.HOMEPAGE_ADMIN_PW);
    await p.click('input[type="submit"], button[type="submit"]');
    await p.waitForTimeout(2000);
    console.log('[홈페이지] 관리자 로그인 완료');
  }
  adminOk = true;
}

async function createBooking({ guestName, phone, roomName, checkIn, nights = 1 }) {
  const p = await getPage('homeBooking');
  try {
    // 1. STAY TYPE 페이지에서 객실 찾기
    await p.goto('https://www.bebridge.kr/staytype');
    await p.waitForTimeout(2000);
    const links = await p.locator('a').all();
    for (const link of links) {
      const txt = await link.textContent();
      if (txt && txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,'').slice(0,4))) {
        await link.click(); await p.waitForTimeout(1500); break;
      }
    }

    // 2. 날짜 선택
    const d = new Date(checkIn);
    const cells = await p.locator('td[onclick], .calendar-day, .day-cell, td').all();
    for (const cell of cells) {
      const t = await cell.textContent().catch(() => '');
      if (t.trim() === String(d.getDate())) { await cell.click(); await p.waitForTimeout(500); break; }
    }

    // 3. 숙박일수
    const nSel = p.locator('select[name*="night"], select[name*="day"]').first();
    if (await nSel.count()) await nSel.selectOption(String(nights));
    await p.waitForTimeout(500);

    // 4. 예약자 정보
    const ph = phone.replace(/[^0-9]/g,'');
    const nameIn = p.locator('input[id*="name"], input[placeholder*="이름"], input[placeholder*="성명"]').first();
    if (await nameIn.count()) await nameIn.fill(guestName);

    const phInputs = await p.locator('input[placeholder*="전화"], input[name*="phone"], input[name*="tel"]').all();
    if (phInputs.length >= 3) {
      await phInputs[0].fill(ph.slice(0,3));
      await phInputs[1].fill(ph.slice(3,7));
      await phInputs[2].fill(ph.slice(7));
    } else if (phInputs.length === 1) { await phInputs[0].fill(phone); }

    // 비상연락처
    const emIn = await p.locator('input[placeholder*="비상"]').all();
    if (emIn.length >= 3) { await emIn[0].fill('010'); await emIn[1].fill('0000'); await emIn[2].fill('0000'); }

    // 5. 예약진행하기
    await p.locator('a:has-text("예약진행"), button:has-text("예약진행")').first().click();
    await p.waitForTimeout(3000);

    // 6. 전체 동의
    const agree = p.locator('label:has-text("전체 동의"), input[id*="all_agree"]').first();
    if (await agree.count()) { await agree.click(); await p.waitForTimeout(300); }

    // 7. 이메일
    const emailIn = p.locator('input[type="email"], input[placeholder*="이메일"]').first();
    if (await emailIn.count()) await emailIn.fill('admin@naver.com');

    // 8. 무통장입금
    const bank = p.locator('label:has-text("무통장"), input[value*="bank"], input[value*="무통장"]').first();
    if (await bank.count()) await bank.click();
    await p.waitForTimeout(300);

    // 9. 결제하기
    await p.locator('button:has-text("결제하기"), a:has-text("결제하기")').last().click();
    await p.waitForTimeout(4000);

    console.log(`[홈페이지] ✅ 예약 생성: ${guestName} / ${roomName} / ${checkIn}`);
    return true;
  } catch (e) {
    console.error(`[홈페이지] ❌ 예약 생성 실패:`, e.message);
    return false;
  }
}

async function confirmBooking(guestName, checkIn) {
  if (!adminOk) await loginAdmin();
  const p = await getPage('homeAdmin');
  try {
    await p.goto(`${ADMIN}/payment/list.php`);
    await p.waitForTimeout(2000);
    const rows = await p.locator('table tbody tr').all();
    for (const row of rows) {
      const txt = await row.textContent().catch(() => '');
      if (!txt.includes(guestName)) continue;
      const btn = row.locator('a:has-text("예약완료"), button:has-text("예약완료")').first();
      if (await btn.count()) {
        const href = await btn.getAttribute('href').catch(() => '');
        if (href) await p.goto(`https://bebridge.kr${href}`);
        else await btn.click();
        await p.waitForTimeout(1500);
        p.on('dialog', d => d.accept());
        console.log(`[홈페이지] ✅ 예약완료 처리: ${guestName}`);
        return true;
      }
    }
    console.log(`[홈페이지] ⚠️ 예약 찾지 못함: ${guestName}`);
    return false;
  } catch (e) {
    console.error(`[홈페이지] ❌ 예약완료 처리 실패:`, e.message);
    return false;
  }
}

module.exports = { createBooking, confirmBooking };
