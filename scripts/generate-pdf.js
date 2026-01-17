const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUTPUT_FILE = 'site_screenshots.pdf';
// __dirname указывает на scripts/, нужно подняться на уровень выше для temp/
const TEMP_DIR = path.join(__dirname, '..', 'temp', 'temp_screenshots');

// Создаем временную директорию
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function waitForServer(browser, maxAttempts = 30) {
  console.log('Ожидание запуска dev-сервера...');
  const testPage = await browser.newPage();
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await testPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 2000 });
      await testPage.close();
      console.log('✓ Сервер запущен!');
      return true;
    } catch (e) {
      // Сервер еще не запущен
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  await testPage.close();
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
    
    const filename = path.join(TEMP_DIR, `${name.replace(/[^a-z0-9]/gi, '_')}.png`);
    fs.writeFileSync(filename, screenshot);
    console.log(`✓ Сохранено: ${filename}`);
    return filename;
  } catch (error) {
    console.error(`✗ Ошибка: ${error.message}`);
    return null;
  }
}

async function generatePDF() {
  console.log('🚀 Запуск генерации PDF со скриншотами сайта...\n');
  
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
    const mainFile = await takeScreenshot(page, '01_Главная_Воронка', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      await p.waitForSelector('.funnel-container, .sales-funnel', { timeout: 10000 });
    });
    if (mainFile) screenshots.push({ name: 'Главная страница - Воронка продаж', file: mainFile });
    
    // 2. Диагностика - Вводный экран
    const diagnosticsIntroFile = await takeScreenshot(page, '02_Диагностика_Вводный', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('button', { timeout: 10000 });
      const buttons = await p.$$('button');
      for (const btn of buttons) {
        const text = await p.evaluate(el => el.textContent || '', btn);
        if (text.includes('Диагностика')) {
          await btn.click();
          break;
        }
      }
      await p.waitForSelector('.diagnostics-container, .diagnostics-intro', { timeout: 10000 });
    });
    if (diagnosticsIntroFile) screenshots.push({ name: 'Диагностика - Вводный экран', file: diagnosticsIntroFile });
    
    // 3. Диагностика - Вопрос 1
    const diagnosticsQ1File = await takeScreenshot(page, '03_Диагностика_Вопрос_1', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('button', { timeout: 10000 });
      const buttons = await p.$$('button');
      for (const btn of buttons) {
        const text = await p.evaluate(el => el.textContent, btn);
        if (text && text.includes('Диагностика')) {
          await btn.click();
          await p.waitForTimeout(1000);
          break;
        }
      }
      await p.waitForSelector('.diagnostics-start-btn, button', { timeout: 10000 });
      const allButtons = await p.$$('button');
      let startBtn = null;
      for (const btn of allButtons) {
        const text = await p.evaluate(el => el.textContent || '', btn);
        if (text.includes('Начать')) {
          startBtn = btn;
          break;
        }
      }
      if (startBtn) {
        await startBtn.click();
        await p.waitForSelector('.diagnostics-question, .question-content', { timeout: 10000 });
      }
    });
    if (diagnosticsQ1File) screenshots.push({ name: 'Диагностика - Вопрос 1', file: diagnosticsQ1File });
    
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
      const blockFile = await takeScreenshot(page, `04_Блок_${blockName}`, async (p) => {
        await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await p.waitForSelector('.funnel-block, [class*="block"]', { timeout: 10000 });
        
        // Ищем блок по тексту или изображению
        let clicked = false;
        
        // Пробуем найти по изображению
        try {
          const img = await p.$(`img[src*="${blockId}"]`);
          if (img) {
            const parent = await p.evaluateHandle(el => el.closest('div, button, a') || el, img);
            await parent.click();
            clicked = true;
          }
        } catch (e) {}
        
        if (!clicked) {
          // Пробуем кликнуть по всем блокам и найти нужный
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
        
        await p.waitForSelector('.block-detail-container, .block-detail', { timeout: 10000 });
      });
      
      if (blockFile) screenshots.push({ name: `Детали блока - ${blockName}`, file: blockFile });
    }
    
    // 11. Портфолио
    const portfolioFile = await takeScreenshot(page, '11_Портфолио', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('button, [class*="portfolio"]', { timeout: 10000 });
      const buttons = await p.$$('button');
      for (const btn of buttons) {
        const text = await p.evaluate(el => el.textContent, btn);
        if (text && text.includes('Портфолио')) {
          await btn.click();
          await p.waitForSelector('.portfolio-container, .portfolio', { timeout: 10000 });
          break;
        }
      }
    });
    if (portfolioFile) screenshots.push({ name: 'Портфолио', file: portfolioFile });
    
    // 12. Профиль
    const profileFile = await takeScreenshot(page, '12_Профиль', async (p) => {
      await p.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await p.waitForSelector('img[alt*="Илья"], .header-avatar, img[src*="me.jpg"]', { timeout: 10000 });
      const avatar = await p.$('img[alt*="Илья"], .header-avatar, img[src*="me.jpg"]');
      if (avatar) {
        await avatar.click();
        await p.waitForSelector('.profile-container, .profile', { timeout: 10000 });
      }
    });
    if (profileFile) screenshots.push({ name: 'Профиль', file: profileFile });
    
  } finally {
    await browser.close();
  }
  
  // Создаем PDF
  console.log('\n📄 Создание PDF файла...');
  const doc = new PDFDocument({
    size: 'A4',
    margin: 20
  });
  
  // Сохраняем PDF в корне проекта
  const outputPath = path.join(__dirname, '..', OUTPUT_FILE);
  doc.pipe(fs.createWriteStream(outputPath));
  
  let pageCount = 0;
  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];
    
    if (fs.existsSync(screenshot.file)) {
      if (i > 0) doc.addPage();
      pageCount++;
      
      // Заголовок
      doc.fontSize(18)
         .fillColor('#333333')
         .text(screenshot.name, 50, 30, { align: 'center' });
      
      // Изображение
      const img = fs.readFileSync(screenshot.file);
      const pageWidth = doc.page.width - 100;
      const pageHeight = doc.page.height - 120;
      
      doc.image(img, 50, 70, { 
        width: pageWidth,
        fit: [pageWidth, pageHeight]
      });
    }
  }
  
  doc.end();
  
  console.log(`\n✅ PDF создан: ${outputPath}`);
  console.log(`📊 Всего страниц: ${pageCount}`);
  
  // Очистка
  console.log('\n🧹 Очистка временных файлов...');
  screenshots.forEach(s => {
    if (fs.existsSync(s.file)) {
      fs.unlinkSync(s.file);
    }
  });
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  
  console.log('\n✨ Готово!');
}

// Запуск
generatePDF().catch(console.error);
