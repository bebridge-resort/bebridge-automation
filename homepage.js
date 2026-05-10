require('dotenv').config();
const { withBrowser } = require('./browser');
const ADMIN = 'https://bebridge.kr/manager_console_bebridge';

async function loginAdmin(p) {
  await p.goto(`${ADMIN}/index.php`, { timeout: 30000 });
  await p.waitForTimeout(1500);
  if (await p.locator('input[type="password"]').count() > 0) {
    await p.fill('input[name="id"], input[type="text"]', process.env.HOMEPAGE_ADMIN_ID);
    await p.fill('input[type="password"]', process.env.HOMEPAGE_ADMIN_PW);
    await p.click('input[type="submit"], button[type="submit"]');
    await p.waitForTimeout(2000);
    console.log('[홈페이지] 관리자 로그인 완료');
  }
}

// 홈페이지 미확인 예약 조회 (입금대기 상태)
async function getPendingBookings() {
  return withBrowser(async p => {
    try {
      await loginAdmin(p);
      await p.goto(`${ADMIN}/payment/list.php`, { timeout: 30000 });
      await p.waitForTimeout(2000);
      const list = await p.evaluate(() => {
        return [...document.querySelectorAll('table tbody tr')].map(row => {
          const td = [...row.querySelectorAll('td')];
          const statusText = td[11]?.textContent?.trim() || '';
          if (!statusText.includes('입금대기')) return null;
          const reservationNo = td[1]?.textContent?.trim() || '';
          if (!reservationNo) return null;
          const dateRaw = td[4]?.textContent?.trim() || '';
          const checkIn = dateRaw.replace(/\(.*\)/, '').trim().replace(/\./g, '-');
          return {
            id: 'home_' + reservationNo,
            channel: 'homepage',
            guestName: td[2]?.textContent?.trim() || '',
            phone: td[10]?.textContent?.trim() || '',
            roomName: td[3]?.textContent?.trim()?.split('\n')[0]?.trim() || '',
            checkIn,
            checkOut: '',
            status: '입금대기',
          };
        }).filter(Boolean);
      });
      console.log('[홈페이지] 조회 완료:', list.length + '건');
      return list;
    } catch (e) {
      console.error('[홈페이지] 예약 조회 실패:', e.message);
      return [];
    }
  });
}

// 홈페이지 예약완료 처리 (입금대기 → 예약완료 버튼 클릭)
async function confirmBooking(guestName, reservationId) {
  return withBrowser(async p => {
    try {
      await loginAdmin(p);
      await p.goto(`${ADMIN}/payment/list.php`, { timeout: 30000 });
      await p.waitForTimeout(2000);
      const rows = await p.locator('table tbody tr').all();
      for (const row of rows) {
        const txt = await row.textContent().catch(() => '');
        if (!txt.includes(guestName) && !txt.includes(reservationId)) continue;
        // 입금대기 버튼 클릭 → 예약완료로 변경
        const btn = row.locator('a, button').filter({ hasText: /입금대기|예약완료|확인/ }).first();
        if (await btn.count()) {
          const href = await btn.getAttribute('href').catch(() => '');
          if (href && href !== '#') {
            await p.goto(`https://bebridge.kr${href}`, { timeout: 30000 });
          } else {
            await btn.click();
          }
          await p.waitForTimeout(1500);
          p.on('dialog', d => d.accept());
          console.log('[홈페이지] ✅ 예약완료 처리:', guestName);
          return true;
        }
      }
      console.log('[홈페이지] ⚠️ 예약 찾지 못함:', guestName);
      return false;
    } catch (e) {
      console.error('[홈페이지] ❌ 예약완료 처리 실패:', e.message);
      return false;
    }
  });
}

// 타 채널 예약 → 홈페이지에 예약 생성
async function createBooking({ guestName, phone, roomName, checkIn, nights = 1 }) {
  return withBrowser(async p => {
    try {
      await p.goto('https://www.bebridge.kr/staytype', { timeout: 30000 });
      await p.waitForTimeout(2000);

      // 객실 찾기
      const links = await p.locator('a').all();
      for (const link of links) {
        const txt = await link.textContent().catch(() => '');
        if (txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,'').slice(0,4))) {
          await link.click(); await p.waitForTimeout(1500); break;
        }
      }

      // 날짜 선택
      const d = new Date(checkIn);
      const cells = await p.locator('td[onclick], .calendar-day, .day-cell, td').all();
      for (const cell of cells) {
        const t = await cell.textContent().catch(() => '');
        if (t.trim() === String(d.getDate())) { await cell.click(); await p.waitForTimeout(500); break; }
      }

      // 숙박일수
      const nSel = p.locator('select[name*="night"], select[name*="day"]').first();
      if (await nSel.count()) await nSel.selectOption(String(nights));
      await p.waitForTimeout(500);

      // 예약자 정보
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

      // 예약진행
      await p.locator('a:has-text("예약진행"), button:has-text("예약진행")').first().click();
      await p.waitForTimeout(3000);

      // 전체동의
      const agree = p.locator('label:has-text("전체 동의"), input[id*="all_agree"]').first();
      if (await agree.count()) { await agree.click(); await p.waitForTimeout(300); }

      // 이메일
      const emailIn = p.locator('input[type="email"], input[placeholder*="이메일"]').first();
      if (await emailIn.count()) await emailIn.fill('admin@naver.com');

      // 무통장입금
      const bank = p.locator('label:has-text("무통장"), input[value*="bank"]').first();
      if (await bank.count()) await bank.click();
      await p.waitForTimeout(300);

      // 결제하기
      await p.locator('button:has-text("결제하기"), a:has-text("결제하기")').last().click();
      await p.waitForTimeout(4000);

      console.log('[홈페이지] ✅ 예약 생성:', guestName, '/', roomName, '/', checkIn);
      return true;
    } catch (e) {
      console.error('[홈페이지] ❌ 예약 생성 실패:', e.message);
      return false;
    }
  });
}

module.exports = { createBooking, confirmBooking, getPendingBookings };

