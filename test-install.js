const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001/install');
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'C:/Temp/install-page.png' });
  await b.close();
  console.log('done');
})();
