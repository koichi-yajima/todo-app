const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);
  await p.screenshot({ path: 'C:/Temp/detail-01-list.png' });

  // タスクをクリックして詳細ビューを開く
  const items = p.locator('.todo-item');
  const count = await items.count();
  if (count === 0) {
    // タスクがなければ作成
    await p.click('#btn-open-modal');
    await p.waitForTimeout(300);
    await p.fill('#task-title', 'テストタスク');
    await p.click('#btn-submit');
    await p.waitForTimeout(500);
  }
  await p.click('.todo-item:first-child .todo-content');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'C:/Temp/detail-02-open.png' });

  // サブタスクを追加
  await p.click('#btn-detail-add');
  await p.waitForTimeout(200);
  await p.fill('#detail-subtask-input', '調査する');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  await p.fill('#detail-subtask-input', '資料を作成する');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  await p.fill('#detail-subtask-input', '提出する');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'C:/Temp/detail-03-subtasks.png' });

  // 1つ完了にする
  await p.click('.detail-check:first-child');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'C:/Temp/detail-04-toggled.png' });

  // 編集ボタン押下
  await p.click('#btn-detail-edit');
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'C:/Temp/detail-05-editmode.png' });

  // その他メニュー
  await p.click('#btn-detail-edit'); // 編集モード終了
  await p.click('#btn-detail-more');
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'C:/Temp/detail-06-more-menu.png' });

  // 戻る
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'C:/Temp/detail-07-back.png' });

  await b.close();
  console.log('done');
})();
