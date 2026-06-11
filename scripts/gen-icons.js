const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sizes = [180, 192, 512];

  for (const size of sizes) {
    const r = Math.round(size * 0.28);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html><html><head>
      <style>*{margin:0;padding:0}body{width:${size}px;height:${size}px;background:#E85424;display:flex;align-items:center;justify-content:center;border-radius:${r}px;overflow:hidden}</style>
      </head><body>
      <svg width="${Math.round(size*0.52)}" height="${Math.round(size*0.52)}" viewBox="0 0 56 56" fill="none">
        <path d="M8 28l13 13 27-26" stroke="white" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </body></html>`);
    const outPath = path.join(__dirname, `../public/icons/icon-${size}.png`);
    await page.screenshot({ path: outPath });
    console.log(`icon-${size}.png generated`);
  }

  await browser.close();
  console.log('Done.');
})();
