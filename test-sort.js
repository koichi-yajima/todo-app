const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);

  // 詳細ビューを開く
  await p.click('.todo-item:first-child .todo-content');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'C:/Temp/sort-01-default.png' });

  // あいうえお順をクリック
  await p.click('[data-sort="alpha"]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'C:/Temp/sort-02-alpha.png' });

  // 更新順に戻す
  await p.click('[data-sort="default"]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'C:/Temp/sort-03-back.png' });

  await b.close();
  console.log('done');
})();
