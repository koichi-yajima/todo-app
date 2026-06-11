const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);
  await p.screenshot({ path: 'C:/Temp/tsort-01-default.png' });

  await p.click('[data-sort="alpha"]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'C:/Temp/tsort-02-alpha.png' });

  await b.close();
  console.log('done');
})();
