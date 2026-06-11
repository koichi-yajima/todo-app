const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);

  // タスクをクリックして詳細ビューを開く
  await p.click('.todo-item:first-child .todo-content');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'C:/Temp/sheet-01-detail.png' });

  // サブタスクタイトルをタップ
  const titles = p.locator('[data-open]');
  const count = await titles.count();
  if (count > 0) {
    await titles.first().click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: 'C:/Temp/sheet-02-sheet-open.png' });

    // タイトルを編集
    await p.fill('#sheet-subtask-input', '変更後のサブタスク名');
    await p.waitForTimeout(200);
    await p.screenshot({ path: 'C:/Temp/sheet-03-editing.png' });

    // 閉じる
    await p.click('#btn-sheet-close');
    await p.waitForTimeout(400);
    await p.screenshot({ path: 'C:/Temp/sheet-04-saved.png' });
  } else {
    console.log('no subtasks found, adding one');
    await p.click('#btn-detail-add');
    await p.waitForTimeout(200);
    await p.fill('#detail-subtask-input', 'テストサブタスク');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    const t2 = p.locator('[data-open]');
    await t2.first().click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: 'C:/Temp/sheet-02-sheet-open.png' });
    await p.click('#btn-sheet-close');
    await p.waitForTimeout(300);
    await p.screenshot({ path: 'C:/Temp/sheet-04-saved.png' });
  }

  await b.close();
  console.log('done');
})();
