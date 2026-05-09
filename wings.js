require('dotenv').config();
const { getPage, resetPage } = require('./browser');
let ok = false;

async function login() {
  const p = await getPage('wings');
  try {
    await p.goto('https://wingscms.com/#/login/zz/zz01_0100');
    await p.waitForTimeout(2000);
    // 1. 컴퍼니 ID
    await p.fill('input[placeholder="컴퍼니 ID"]', process.env.WINGS_COMPANY_ID);
    // 2. 사용자 ID / 이메일
    await p.fill('input[placeholder="사용자 ID / 이메일"]', process.env.WINGS_ID);
    // 3. 비밀번호
    await p.fill('input[placeholder="비밀번호"], input[type="password"]', process.env.WINGS_PW);
    await p.click('button:has-text("로그인")');
    await p.waitForTimeout(4000);
  } catch (e) {
    console.error('[윙스] 로그인 오류:', e.message);
  }
  ok = true;
  console.log('[윙스] 로그인 완료');
}

// 윙스 신규 예약 목록 조회
async function getReservations() {
  if (!ok) await login();
  const p = await getPage('wings');
  try {
    await p.goto('https://wingscms.com/#/app/zz/zz03_0100');
    await p.waitForTimeout(4000);
    return await p.evaluate(() => {
      const toISO = s => {
        if (!s) return '';
        const m = s.trim().match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
        return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : '';
      };
      return [...document.querySelectorAll('table tbody tr')].map(row => {
        const td = [...row.querySelectorAll('td')];
        return {
          id: 'wings_' + (td[0]?.textContent?.trim() || ''),
          channel: 'wings',
          guestName: td[2]?.textContent?.trim()?.split('\n')[0]?.trim(),
          phone: td[3]?.textContent?.trim(),
          roomName: td[5]?.textContent?.trim()?.split('\n')[0]?.trim(),
          checkIn:  toISO(td[6]?.textContent?.trim()),
          checkOut: toISO(td[7]?.textContent?.trim()),
          status: td[1]?.textContent?.trim(),
        };
      }).filter(r => r.id.length > 7 && r.roomName && r.checkIn);
    });
  } catch (e) {
    console.error('[윙스] 예약 조회 실패:', e.message);
    ok = false; await resetPage('wings');
    return [];
  }
}

// 윙스: 인벤토리 관리 > 오픈→판매마감→저장→확인
async function blockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  const p = await getPage('wings');
  try {
    await p.goto('https://wingscms.com/#/app/cm/cm03_0300');
    await p.waitForTimeout(4000);

    // 날짜 설정
    const dateIn = p.locator('input[type="date"]').first();
    if (await dateIn.count()) { await dateIn.fill(checkIn); await p.waitForTimeout(300); }

    // 조회
    const searchBtn = p.locator('button:has-text("조회")').first();
    if (await searchBtn.count()) { await searchBtn.click(); await p.waitForTimeout(2000); }

    const ciD = new Date(checkIn);
    const coD = new Date(checkOut);
    let cur = new Date(ciD);

    while (cur < coD) {
      const mm = String(cur.getMonth()+1).padStart(2,'0');
      const dd = String(cur.getDate()).padStart(2,'0');

      // 날짜 컬럼 헤더 찾기
      const ths = await p.locator('th').all();
      let colIdx = -1;
      for (let i = 0; i < ths.length; i++) {
        const t = (await ths[i].textContent()).replace(/\s/g,'');
        if (t.includes(`${mm}/${dd}`) || t.includes(String(cur.getDate()))) { colIdx = i; break; }
      }

      if (colIdx >= 0) {
        const rows = await p.locator('tr').all();
        for (const row of rows) {
          const txt = await row.textContent().catch(() => '');
          if (!txt.toLowerCase().includes(roomName.toLowerCase().slice(0,5))) continue;
          const cells = await row.locator('td').all();
          if (colIdx < cells.length) {
            const openBtn = cells[colIdx].locator('button:has-text("오픈")');
            if (await openBtn.count()) {
              await openBtn.click(); await p.waitForTimeout(500);
              const closeBtn = cells[colIdx].locator('button:has-text("판매마감")');
              if (await closeBtn.count()) { await closeBtn.click(); await p.waitForTimeout(300); }
            }
          }
          break;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    // 저장 → 확인
    const saveBtn = p.locator('button:has-text("저장")').first();
    if (await saveBtn.count()) {
      await saveBtn.click(); await p.waitForTimeout(1500);
      p.on('dialog', d => d.accept());
      const confirmBtn = p.locator('button:has-text("확인")').first();
      if (await confirmBtn.count()) { await confirmBtn.click(); await p.waitForTimeout(500); }
    }

    console.log(`[윙스] ✅ ${roomName} 방막기 완료`);
    return true;
  } catch (e) {
    console.error(`[윙스] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

async function unblockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  console.log(`[윙스] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
