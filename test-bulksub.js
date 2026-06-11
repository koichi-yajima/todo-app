const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);

  // 新しいタスクを作成
  await p.click('#btn-open-modal');
  await p.waitForTimeout(300);
  await p.fill('#task-title', '数字リストテスト');
  await p.click('#btn-submit');
  await p.waitForTimeout(500);

  // そのタスクの詳細を開く
  const items = p.locator('.todo-item');
  const last = items.last();
  await last.locator('.todo-content').click();
  await p.waitForTimeout(400);

  // + ボタンで入力欄を開く
  await p.click('#btn-detail-add');
  await p.waitForTimeout(200);

  // 1.5.10 を入力
  await p.fill('#detail-subtask-input', '1.5.10');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'C:/Temp/bulk-01-dot.png' });

  // 次に 20-25 を入力
  await p.fill('#detail-subtask-input', '20-25');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'C:/Temp/bulk-02-range.png' });

  await b.close();
  console.log('done');
})();
