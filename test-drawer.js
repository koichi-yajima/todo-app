const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);
  await p.click('#btn-menu');
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'C:/Temp/drawer-new.png' });
  await b.close();
  console.log('done');
})();
