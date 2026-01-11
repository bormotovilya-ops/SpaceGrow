const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, 'screenshots');
const HTML_FILE = path.join(__dirname, 'screenshots.html');

// Создаем директорию для скриншотов
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function waitForServer(browser, maxAttempts = 60) {
  console.log('Ожидание запуска dev-сервера...');
  let testPage = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (!testPage || testPage.isClosed()) {
        testPage = await browser.newPage();
      }
      await testPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 3000 });
      if (testPage && !testPage.isClosed()) {
        await testPage.close();
      }
      console.log('\n✓ Сервер запущен!');
      return true;
    } catch (e) {
      if (testPage && !testPage.isClosed()) {
        try {
          await testPage.close();
        } catch (e2) {}
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (i % 5 === 0) process.stdout.write('.');
  }
  if (testPage && !testPage.isClosed()) {
    try {
      await testPage.close();
    } catch (e) {}
  }
  console.log('\n✗ Сервер не запустился за отведенное время');
  return false;
}

async function takeScreenshot(page, name, action = null) {
  try {
    console.log(`\n📸 ${name}...`);
    
    if (action) {
      await action(page);
    }
    
    await page.waitForTimeout(2000);
    
    const screenshot = await page.screenshot({ 
      fullPage: true,
      type: 'png'
    });
    
    const filename = path.join(OUTPUT_DIR, `${name.replace(/[^a-z0-9]/gi, '_')}.png`);
    fs.writeFileSync(filename, screenshot);
    console.log(`✓ Сохранено: ${filename}`);
    return { name, file: filename };
  } catch (error) {
    console.error(`✗ Ошибка: ${error.message}`);
    return null;
  }
}

async function generateScreenshots() {
  console.log('🚀 Запуск генерации скриншотов сайта...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  // Ждем запуска сервера
  const serverReady = await waitForServer(browser);
  if (!serverReady) {
    console.log('\n⚠️  Убедитесь, что dev-сервер запущен: npm run dev');
    await browser.close();
    return;
  }
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const screenshots = [];
  
  try {
    // 1. Главная страница - Воронка
    const main = await takeScreenshot(page, '01_Главная_Воронка', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      await p.waitForSelector('.funnel-container, .sales-funnel, body', { timeout: 10000 });
    });
    if (main) screenshots.push(main);
    
    // 2. Диагностика - Вводный экран
    const diagnosticsIntro = await takeScreenshot(page, '02_Диагностика_Вводный', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('button', { timeout: 10000 });
      const buttons = await p.$$('button');
      for (const btn of buttons) {
        const text = await p.evaluate(el => el.textContent || '', btn);
        if (text.includes('Диагностика')) {
          await btn.click();
          await p.waitForSelector('.diagnostics-container, .diagnostics-intro', { timeout: 10000 });
          break;
        }
      }
    });
    if (diagnosticsIntro) screenshots.push(diagnosticsIntro);
    
    // 3. Диагностика - Вопрос 1
    const diagnosticsQ1 = await takeScreenshot(page, '03_Диагностика_Вопрос_1', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('button', { timeout: 10000 });
      const buttons = await p.$$('button');
      for (const btn of buttons) {
        const text = await p.evaluate(el => el.textContent || '', btn);
        if (text.includes('Диагностика')) {
          await btn.click();
          await p.waitForTimeout(1000);
          break;
        }
      }
      await p.waitForSelector('.diagnostics-start-btn, button', { timeout: 10000 });
      const allButtons = await p.$$('button');
      for (const btn of allButtons) {
        const text = await p.evaluate(el => el.textContent || '', btn);
        if (text.includes('Начать')) {
          await btn.click();
          await p.waitForSelector('.diagnostics-question, .question-content', { timeout: 10000 });
          break;
        }
      }
    });
    if (diagnosticsQ1) screenshots.push(diagnosticsQ1);
    
    // 4-10. Детальные страницы блоков воронки
    const blockNames = {
      'audience': 'Аудитория',
      'landing': 'Лендинг',
      'leadmagnet': 'Лидмагнит',
      'autofunnel': 'Автоворонки прогрева',
      'product': 'Продукт',
      'money': 'Деньги',
      'value': 'Ценность'
    };
    
    for (const [blockId, blockName] of Object.entries(blockNames)) {
      const block = await takeScreenshot(page, `04_Блок_${blockName}`, async (p) => {
        await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await p.waitForSelector('.funnel-block, [class*="block"], body', { timeout: 10000 });
        
        let clicked = false;
        try {
          const img = await p.$(`img[src*="${blockId}"]`);
          if (img) {
            const parent = await p.evaluateHandle(el => el.closest('div, button, a') || el, img);
            await parent.click();
            clicked = true;
          }
        } catch (e) {}
        
        if (!clicked) {
          const blocks = await p.$$('.funnel-block, [class*="block"], div[class*="funnel"]');
          for (const block of blocks) {
            const text = await p.evaluate(el => el.textContent || '', block);
            if (text.includes(blockName)) {
              await block.click();
              clicked = true;
              break;
            }
          }
        }
        
        await p.waitForSelector('.block-detail-container, .block-detail, body', { timeout: 10000 });
      });
      
      if (block) screenshots.push(block);
    }
    
    // 11. Портфолио
    const portfolio = await takeScreenshot(page, '11_Портфолио', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('button, [class*="portfolio"]', { timeout: 10000 });
      const buttons = await p.$$('button');
      for (const btn of buttons) {
        const text = await p.evaluate(el => el.textContent || '', btn);
        if (text.includes('Портфолио')) {
          await btn.click();
          await p.waitForSelector('.portfolio-container, .portfolio, body', { timeout: 10000 });
          break;
        }
      }
    });
    if (portfolio) screenshots.push(portfolio);
    
    // 12. Профиль
    const profile = await takeScreenshot(page, '12_Профиль', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('img[alt*="Илья"], .header-avatar, img[src*="me.jpg"]', { timeout: 10000 });
      const avatar = await p.$('img[alt*="Илья"], .header-avatar, img[src*="me.jpg"]');
      if (avatar) {
        await avatar.click();
        await p.waitForSelector('.profile-container, .profile, body', { timeout: 10000 });
      }
    });
    if (profile) screenshots.push(profile);
    
  } finally {
    await browser.close();
  }
  
  // Создаем HTML файл для просмотра
  console.log('\n📄 Создание HTML файла для просмотра...');
  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Скриншоты сайта</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .screenshot-item {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .screenshot-item h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.5em;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .screenshot-item img {
      width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      display: block;
    }
    .stats {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .stats p {
      font-size: 1.2em;
      color: #333;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 Скриншоты всех страниц сайта</h1>
    <div class="stats">
      <p><strong>Всего скриншотов:</strong> ${screenshots.length}</p>
      <p><strong>Дата создания:</strong> ${new Date().toLocaleString('ru-RU')}</p>
    </div>
    ${screenshots.map((s, i) => `
      <div class="screenshot-item">
        <h2>${i + 1}. ${s.name}</h2>
        <img src="${path.relative(__dirname, s.file).replace(/\\/g, '/')}" alt="${s.name}">
      </div>
    `).join('')}
  </div>
</body>
</html>`;
  
  fs.writeFileSync(HTML_FILE, htmlContent);
  
  console.log(`\n✅ Готово!`);
  console.log(`📁 Скриншоты сохранены в папку: ${OUTPUT_DIR}`);
  console.log(`🌐 HTML файл для просмотра: ${HTML_FILE}`);
  console.log(`📊 Всего скриншотов: ${screenshots.length}`);
  console.log(`\n💡 Откройте файл ${path.basename(HTML_FILE)} в браузере для просмотра всех скриншотов`);
}

// Запуск
generateScreenshots().catch(console.error);





