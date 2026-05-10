require('dotenv').config();
const { withBrowser } = require('./browser');
const ADMIN = 'https://bebridge.kr/manager_console_bebridge';

// OTA 자동생성 예약 prefix 목록
const OTA_PREFIXES = ['네/', '여/', '떠/', '윙/'];

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

// ─────────────────────────────────────────────────────────────
// 홈페이지 직접 예약 감지
// - 객실예약 목록에서 "예약완료(완료)" 상태 중
// - OTA prefix 없는 것 = 고객 직접 예약 → OTA 방막기 필요
// - 입금대기는 수동 처리이므로 건드리지 않음
// ─────────────────────────────────────────────────────────────
async function getPendingBookings() {
  return withBrowser(async p => {
    try {
      await loginAdmin(p);
      await p.goto(`${ADMIN}/reservation/list.php`, { timeout: 30000 });
      await p.waitForTimeout(2000);

      const list = await p.evaluate((prefixes) => {
        const toDate = s => {
          if (!s) return '';
          return s.replace(/\(.*?\)/g, '').trim().replace(/\./g, '-');
        };
        return [...document.querySelectorAll('table tbody tr')].map(row => {
          const td = [...row.querySelectorAll('td')];
          if (td.length < 12) return null;

          const statusEl = td[11];
          const statusText = statusEl?.textContent?.trim() || '';

          // "완료" 상태만 처리 (입금대기 제외)
          if (!statusText.includes('완료')) return null;
          if (statusText.includes('입금')) return null;

          const reservationNo = td[1]?.textContent?.trim() || '';
          if (!reservationNo) return null;

          const guestName = td[2]?.textContent?.trim() || '';

          // OTA 자동생성 예약 제외 (prefix 있는 것)
          if (prefixes.some(p => guestName.startsWith(p))) return null;

          const dateRaw = td[4]?.textContent?.trim() || '';
          const checkIn = toDate(dateRaw.split('~')[0]);
          const checkOut = toDate(dateRaw.split('~')[1] || '');

          return {
            id: 'home_' + reservationNo,
            channel: 'homepage',
            guestName,
            phone: td[10]?.textContent?.trim() || '',
            roomName: td[3]?.textContent?.trim()?.split('\n')[0]?.trim() || '',
            checkIn,
            checkOut,
            status: '예약완료',
          };
        }).filter(Boolean);
      }, OTA_PREFIXES);

      console.log('[홈페이지] 조회 완료: ' + list.length + '건');
      return list;
    } catch (e) {
      console.error('[홈페이지] 예약 조회 실패:', e.message);
      return [];
    }
  });
}

// ─────────────────────────────────────────────────────────────
// OTA 예약 → 홈페이지에 새 예약 생성
// guestName에 채널 prefix 포함 (예: "여/홍길동")
// ─────────────────────────────────────────────────────────────
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

      // 예약자 정보 (prefix 포함된 이름 그대로 입력)
      const ph = phone.replace(/[^0-9]/g,'');
      const nameIn = p.locator('input[id*="name"], input[placeholder*="이름"], input[placeholder*="성명"]').first();
      if (await nameIn.count()) await nameIn.fill(guestName);

      const phInputs = await p.locator('input[placeholder*="전화"], input[name*="phone"], input[name*="tel"]').all();
      if (phInputs.length >= 3) {
        await phInputs[0].fill(ph.slice(0,3));
        await phInputs[1].fill(ph.slice(3,7));
        await phInputs[2].fill(ph.slice(7));
      } else if (phInputs.length === 1) { await phInputs[0].fill(phone); }

      const emIn = await p.locator('input[placeholder*="비상"]').all();
      if (emIn.length >= 3) { await emIn[0].fill('010'); await emIn[1].fill('0000'); await emIn[2].fill('0000'); }

      await p.locator('a:has-text("예약진행"), button:has-text("예약진행")').first().click();
      await p.waitForTimeout(3000);

      const agree = p.locator('label:has-text("전체 동의"), input[id*="all_agree"]').first();
      if (await agree.count()) { await agree.click(); await p.waitForTimeout(300); }

      const emailIn = p.locator('input[type="email"], input[placeholder*="이메일"]').first();
      if (await emailIn.count()) await emailIn.fill('admin@naver.com');

      const bank = p.locator('label:has-text("무통장"), input[value*="bank"]').first();
      if (await bank.count()) await bank.click();
      await p.waitForTimeout(300);

      await p.locator('button:has-text("결제하기"), a:has-text("결제하기")').last().click();
      await p.waitForTimeout(4000);

      console.log('[홈페이지] ✅ 예약 생성: ' + guestName + ' / ' + roomName + ' / ' + checkIn);
      return true;
    } catch (e) {
      console.error('[홈페이지] ❌ 예약 생성 실패:', e.message);
      return false;
    }
  });
}

module.exports = { createBooking, confirmBooking, getPendingBookings };

// ─────────────────────────────────────────────────────────────
// 관리자페이지에서 예약완료 클릭 (OTA 자동생성 예약 확정)
// ─────────────────────────────────────────────────────────────
async function confirmBooking(guestName, checkIn) {
  return withBrowser(async p => {
    try {
      await loginAdmin(p);
      await p.goto(`${ADMIN}/payment/list.php`, { timeout: 30000 });
      await p.waitForTimeout(2000);

      const rows = await p.locator('table tbody tr').all();
      for (const row of rows) {
        const txt = await row.textContent().catch(() => '');

        // 이름 + 체크인 날짜로 해당 예약 찾기
        const nameMatch = txt.includes(guestName);
        const dateMatch = checkIn ? txt.includes(checkIn.replace(/-/g, '.')) : true;
        if (!nameMatch) continue;

        // 입금대기 상태 버튼 클릭 → 예약완료로 변경
        const statusBtn = row.locator('a, button').filter({ hasText: /입금대기/ }).first();
        if (await statusBtn.count()) {
          const href = await statusBtn.getAttribute('href').catch(() => '');
          if (href && href !== '#' && href !== 'javascript:;') {
            await p.goto('https://bebridge.kr' + href, { timeout: 30000 });
            await p.waitForTimeout(1000);
            // 확인 팝업이 뜰 경우
            p.on('dialog', d => d.accept());
          } else {
            await statusBtn.click();
            await p.waitForTimeout(1000);
            p.on('dialog', d => d.accept());
          }
          console.log('[홈페이지] ✅ 예약완료 처리: ' + guestName);
          return true;
        }

        // 이미 예약완료 상태면 OK
        const doneBtn = row.locator('a, button').filter({ hasText: /예약완료/ }).first();
        if (await doneBtn.count()) {
          console.log('[홈페이지] 이미 예약완료: ' + guestName);
          return true;
        }
      }

      console.log('[홈페이지] ⚠️ 예약 찾지 못함: ' + guestName);
      return false;
    } catch (e) {
      console.error('[홈페이지] ❌ 예약완료 처리 실패:', e.message);
      return false;
    }
  });
}
