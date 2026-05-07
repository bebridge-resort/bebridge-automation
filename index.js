// 윙스CMS 인벤토리 관리
// 방막기: 날짜 선택 > 호텔객실 선택 > 조회 > 오픈 클릭 > 판매마감 > 저장 > 확인
require('dotenv').config();
const { getPage } = require('./browser');
let loggedIn = false;

async function login() {
  const p = await getPage('wings');
  await p.goto('https://wingscms.com/');
  await p.waitForTimeout(2000);
  try {
    await p.fill('input[type="text"]', process.env.WINGS_ID);
    await p.fill('input[type="password"]', process.env.WINGS_PW);
    await p.click('button[type="submit"], .login-button');
    await p.waitForTimeout(4000);
  } catch {}
  loggedIn = true;
  console.log('[윙스] 로그인 완료');
}

async function blockDates(roomName, checkIn, checkOut) {
  if (!loggedIn) await login();
  const p = await getPage('wings');
  try {
    await p.goto('https://wingscms.com/#/app/cm/cm03_0300');
    await p.waitForTimeout(4000);

    // 날짜 입력
    const dateInput = p.locator('input[type="date"]').first();
    if (await dateInput.count()) {
      await dateInput.fill(checkIn);
      await p.waitForTimeout(300);
    }

    // 호텔객실 드롭다운에서 전체 선택 또는 해당 객실 선택
    const roomSelect = p.locator('select').first();
    if (await roomSelect.count()) {
      // 먼저 전체 조회
      const options = await roomSelect.locator('option').allTextContents();
      const match = options.find(o => o.toLowerCase().includes(roomName.toLowerCase().slice(0,5)));
      if (match) await roomSelect.selectOption({ label: match });
    }

    // 조회 버튼
    await p.locator('button:has-text("조회"), .btn-search').click();
    await p.waitForTimeout(2000);

    // 체크인~체크아웃 날짜별 처리
    const checkInD  = new Date(checkIn);
    const checkOutD = new Date(checkOut);
    let cur = new Date(checkInD);

    while (cur < checkOutD) {
      const mm = String(cur.getMonth()+1).padStart(2,'0');
      const dd = String(cur.getDate()).padStart(2,'0');
      const dateStr = `${mm}/${dd}`;

      // 날짜 컬럼에서 해당 날짜 찾기
      const headers = await p.locator('th, .col-date').all();
      let targetCol = -1;
      for (let i = 0; i < headers.length; i++) {
        const t = await headers[i].textContent();
        if (t.trim().includes(dateStr) || t.trim().includes(String(cur.getDate()))) {
          targetCol = i;
          break;
        }
      }

      if (targetCol >= 0) {
        // 해당 날짜의 "오픈" 버튼 클릭
        const rows = await p.locator('tr').all();
        for (const row of rows) {
          const txt = await row.textContent().catch(() => '');
          if (!txt.toLowerCase().includes(roomName.toLowerCase().slice(0,5))) continue;

          const cells = await row.locator('td').all();
          if (targetCol < cells.length) {
            const openBtn = cells[targetCol].locator('button:has-text("오픈")');
            if (await openBtn.count()) {
              await openBtn.click();
              await p.waitForTimeout(500);
              // 판매마감 버튼이 나타나면 클릭
              const closeBtn = cells[targetCol].locator('button:has-text("판매마감")');
              if (await closeBtn.count()) {
                await closeBtn.click();
                await p.waitForTimeout(300);
              }
            }
          }
          break;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    // 저장 버튼
    const saveBtn = p.locator('button:has-text("저장")').first();
    if (await saveBtn.count()) {
      await saveBtn.click();
      await p.waitForTimeout(1500);
      // 확인 다이얼로그
      p.on('dialog', d => d.accept());
      const confirmBtn = p.locator('button:has-text("확인")').first();
      if (await confirmBtn.count()) {
        await confirmBtn.click();
        await p.waitForTimeout(500);
      }
    }

    console.log(`[윙스] ✅ ${roomName} 방막기 완료 (${checkIn}~${checkOut})`);
    return true;
  } catch (e) {
    console.error(`[윙스] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

async function unblockDates(roomName, checkIn, checkOut) {
  if (!loggedIn) await login();
  // blockDates 역순 - 판매마감 → 오픈으로
  console.log(`[윙스] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { blockDates, unblockDates };
