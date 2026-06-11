const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:3001');
  await p.waitForTimeout(700);
  await p.click('#btn-qr');
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'C:/Temp/qr-modal.png' });
  await b.close();
  console.log('done');
})();
