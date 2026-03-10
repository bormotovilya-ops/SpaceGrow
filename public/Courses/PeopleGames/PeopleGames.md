---
marp: true
theme: default
backgroundColor: #0f172a
style: |
  section {
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background-image: url('office.jpg');
    background-size: cover;
    background-position: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  /* Персонаж: Артур Борисович (файл в курсе: boss..png) */
  .boss {
    position: absolute;
    bottom: 0;
    right: 5%;
    height: 90%;
    z-index: 1;
    transition: all 0.5s ease;
  }

  /* Глава 2: кухня — фон KITCHEN.png, персонаж Леночка1.png / Леночка2.png */
  section.ch2 { background-image: url('KITCHEN.png'); }
  .character { position: absolute; bottom: 0; right: 5%; height: 90%; z-index: 1; }

  /* Основное окно диалога */
  .dialog-box {
    position: relative;
    z-index: 2;
    background: rgba(15, 23, 42, 0.95);
    border: 2px solid #60a5fa;
    border-top: 4px solid #60a5fa;
    border-radius: 15px 15px 0 0;
    margin: 0 20px;
    padding: 25px 40px;
    color: white;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
    min-height: 180px;
  }

  /* Имя говорящего */
  .name-tag {
    position: absolute;
    top: -20px;
    left: 40px;
    background: #60a5fa;
    color: #0f172a;
    padding: 5px 20px;
    border-radius: 5px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 16px;
    letter-spacing: 1px;
  }

  /* Контейнер для кнопок выбора */
  .choices-overlay {
    position: absolute;
    top: 20%;
    left: 5%;
    width: 40%;
    z-index: 10;
  }

  .btn-choice {
    display: block;
    width: 100%;
    background: rgba(30, 41, 59, 0.9);
    border: 2px solid #60a5fa;
    color: white;
    padding: 18px;
    margin-bottom: 15px;
    border-radius: 12px;
    text-align: left;
    font-size: 18px;
    cursor: pointer;
    transition: 0.3s;
  }

  .btn-choice:hover {
    background: #60a5fa;
    color: #0f172a;
    transform: scale(1.02);
  }

  .btn-choice.premium {
    border-color: #facc15;
    color: #facc15;
    box-shadow: 0 0 15px rgba(250, 204, 21, 0.24);
  }

  /* Бейджи статов */
  .stat-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-weight: bold;
    margin-right: 10px;
  }

  /* Блок начисления баллов */
  .points-outcome {
    text-align: left;
    margin: 20px 0;
  }
  .points-outcome .points-rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
  }
  .points-outcome .points-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    font-size: 1.25rem;
    font-weight: 700;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(165, 180, 252, 0.18));
    border: 1px solid rgba(165, 180, 252, 0.45);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  }
  .points-outcome .points-icon { font-size: 1.4rem; }
  .points-outcome .points-num { min-width: 1.8em; text-align: right; color: #a5b4fc; }
---

<!-- Соответствие index.html: слайды 0–2 — интро, Берн, «Что получите»; 3 — обложка гл.1; 4–7 — новелла гл.1; 8–10 — теория и баллы гл.1; 11 — обложка гл.2; 12–18 — новелла и итог гл.2; 19–21 — теория и баллы гл.2; 22–26 — квиз и сертификат. Всего 27 слайдов. Ассеты: boss..png, Леночка1.png, Леночка2.png, office.jpg, KITCHEN.png. -->

<!-- 1. Вступление, текущая ситуация (slide 4) -->
<div class="dialog-box">
  <div class="name-tag">Вы (мысли)</div>
  <p style="font-size: 26px;">17:50. Последние десять минут до свободы. План прост: исчезнуть из офиса до того, как заметят. Вечер обещает быть долгим и нерабочим...</p>
</div>

---

<!-- 2. Появляется проблема (slide 5) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">О, [Имя]! Какое везение — ты еще здесь. У нас катастрофа: клиент в ярости, правки к понедельнику. Только твое стальное спокойствие спасет проект. Не бросишь команду?</p>
</div>

---

<!-- 3. Выбор варианта решения (slide 6) -->
<img src="boss..png" class="boss" style="filter: brightness(0.3) grayscale(100%);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">1. Конечно, Артур Борисович. Всё сделаю, не переживайте.</div>
  <div class="btn-choice">2. Опять я?! У меня вообще-то тоже есть личная жизнь!</div>
  <div class="btn-choice premium">3. Готов спасти ситуацию. Как насчёт премии или отгула за переработки?</div>
</div>

<div class="dialog-box" style="border-color: #facc15;">
  <div class="name-tag" style="background: #facc15;">Совет психолога</div>
  <p style="font-size: 20px; color: #cbd5e1;">Внимание: Артур Борисович играет в «Загнанную лошадь» — смешивает лесть («ты лучший») с чувством вины («не бросишь команду»). Он ждёт послушного Ребёнка. Твой ход?</p>
</div>

---

<!-- 4. Результат решения — вариант 3 (slide 7, success) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">Оу... Ты сразу берёшь быка за рога. Справедливо. Закроешь вопрос до утра понедельника — получишь отгул и бонус к премии. Договорились?</p>
</div>

---

<!-- 4. Результат — вариант 1: «Я так и знал...» (slide 7, wrong) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">Я знал, что на тебя можно положиться. Жду результат к понедельнику.</p>
</div>

---

<!-- 4. Результат — вариант 2: «Если к понедельнику...» (slide 7, wrong) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">Если к понедельнику результата не будет — будем разбираться иначе. На таких у меня нет времени.</p>
</div>

---

<!-- 5. Общая теория Э. Берна (slide 8) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a5b4fc;">5. Общая теория Э. Берна на данную тему</div>
  <h2 style="color: #facc15; font-size: 1.5rem; margin: 0 0 12px 0;">Трое внутри тебя (Эрик Берн) 🧠</h2>
  <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 10px;">Психолог Эрик Берн описал три эго-состояния, из которых мы общаемся. В каждой ситуации включается одно из них.</p>
  <ul style="font-size: 17px; color: #cbd5e1;">
    <li><strong class="text-amber-400">Родитель</strong> — голос правил, долга, критики или опеки. Здесь Артур Борисович давит как Родитель и ждёт послушного Ребёнка.</li>
    <li><strong class="text-accent">Взрослый</strong> — опора на факты и переговоры. Вариант 3 в «Пятничном капкане» — ответ из Взрослого.</li>
    <li><strong class="text-green-400">Ребёнок</strong> — эмоции, страх или бунт. Вариант 1 — Послушный, вариант 2 — Бунтующий Ребёнок. Оба сохраняют игру.</li>
  </ul>
  <p style="font-size: 17px; color: #60a5fa;"><strong>Вывод:</strong> На работе выгоднее общаться Взрослый — Взрослый.</p>
</div>

---

<!-- 5. Общая теория — игра «Загнанная лошадь» (slide 9) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a5b4fc;">5. Общая теория Э. Берна на данную тему</div>
  <h2 style="color: #facc15; font-size: 1.5rem; margin: 0 0 12px 0;">Что такое «Психологическая игра»? 🎭</h2>
  <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 10px;"><strong>Игра «Загнанная лошадь»:</strong> манипулятор выжимает работу или уступки без равного обмена. Смешивает <strong>лесть</strong>, <strong>чувство вины</strong> и <strong>срочность</strong>, ожидая ответа Послушного Ребёнка: «Хорошо, я всё сделаю» — без условий.</p>
  <p style="font-size: 18px; color: #cbd5e1;"><strong>Что делает Артур Борисович:</strong> комплимент + вина + жёсткий дедлайн. Цель — переработка без отгула и премии.</p>
  <p style="font-size: 17px; color: #60a5fa;"><strong>Выход:</strong> ответ из позиции Взрослого (вариант 3 с переговорами) снимает игру.</p>
</div>

---

<!-- 6. Пояснение выбранного варианта, начисление баллов (slide 10) -->
<div class="dialog-box" style="margin-bottom: 50px;">
  <div class="name-tag">Итоги Главы 1: «Пятничный капкан»</div>

  <p style="font-size: 20px; margin-bottom: 8px;"><strong>Ваш выбор: вариант 3 — позиция Взрослого.</strong></p>
  <p style="font-size: 18px; color: #cbd5e1;">По Берну это ответ из состояния Взрослого: вы перевели разговор в переговоры и получили отгул и бонус.</p>

  <div class="points-outcome">
    <p style="font-size: 18px; color: #e2e8f0;"><strong>Начислено:</strong></p>
    <div class="points-rows">
      <div class="points-row"><span class="points-icon">💎</span> Осознанность: +<span class="points-num">20</span></div>
      <div class="points-row"><span class="points-icon">🔥</span> Влияние: +<span class="points-num">10</span></div>
      <div class="points-row"><span class="points-icon">🔋</span> Ресурс: +<span class="points-num">15</span></div>
    </div>
  </div>

  <p style="font-style: italic; color: #94a3b8; font-size: 18px; margin-top: 20px;">
    Блестяще! Вы не только защитили границы, но и превратили манипуляцию в выгодную сделку.
  </p>
</div>

---

<!-- Обложка Глава 2 (slide 11) -->
<div class="dialog-box" style="text-align: center; justify-content: center; display: flex; flex-direction: column; align-items: center; min-height: 300px; margin-bottom: 100px;">
  <h1 style="color: #a5b4fc; font-size: 60px; margin: 0;">ГЛАВА 2</h1>
  <h2 style="color: #60a5fa; font-size: 40px; margin: 10px 0;">«Кухонная западня»</h2>
  <div style="width: 100px; height: 4px; background: #facc15; margin: 20px 0;"></div>
  <p style="font-size: 22px; color: #cbd5e1;">Сложность: <b>Средний уровень</b></p>
</div>

---

<!-- Глава 2. Диалог 1 (slide 12) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Ой, привет... Как я тебе завидую: у тебя всё по полочкам. А у меня отчёт по регионам — сижу три часа, цифры плывут. Кажется, завалю дедлайн и меня «съедят».</p>
</div>

---

<!-- Глава 2. Ваш ответ 1 (slide 13) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" style="filter: brightness(0.5);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">Не паникуй. Выгрузи данные через Power BI — там всё почти сосчитается само.</div>
  <div class="btn-choice">Да, ситуация непростая. Что ты планируешь делать?</div>
</div>

<div class="dialog-box">
  <div class="name-tag">Вы</div>
  <p style="font-size: 22px;">Коллегу надо подбодрить, она выглядит совсем потерянной...</p>
</div>

---

<!-- Глава 2. Диалог 2 (slide 14) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;"><strong>Да, но...</strong> айтишник сказал, что у меня старая версия, она всё время вылетает. Боюсь нажать не туда и всё удалить!</p>
</div>

---

<!-- Глава 2. Ваш ответ 2 (slide 15) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" style="filter: brightness(0.5);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">Тогда просто скопируй прошлый отчёт и подставь новые цифры вручную.</div>
  <div class="btn-choice">Жаль. Похоже, вечер будет тяжёлый. Ладно, я пойду?</div>
</div>

<div class="dialog-box">
  <div class="name-tag">Вы</div>
  <p style="font-size: 22px;">Может, ручной способ её выручит? Это же элементарно.</p>
</div>

---

<!-- Глава 2. Диалог 3 (slide 16) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;"><strong>Да, но...</strong> в прошлый раз формула была с ошибкой, и шеф меня чуть не съел. Теперь к файлу страшно прикасаться. Может, взглянешь одним глазком? Ты же профи!</p>
</div>

---

<!-- Глава 2. Ваш ответ 3 (slide 17) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" style="filter: brightness(0.4) grayscale(100%);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">Ладно, давай файл, быстро гляну формулы.</div>
  <div class="btn-choice">Хватит ныть, Лена. Просто сядь и сделай, там работы на час!</div>
  <div class="btn-choice premium">Понимаю твою тревогу. Какой у тебя план? Что собираешься делать?</div>
</div>

<div class="dialog-box" style="border-color: #facc15;">
  <div class="name-tag" style="background: #facc15;">Совет психолога</div>
  <p style="font-size: 19px; color: #cbd5e1;">Леночка играет в <b>«Да, но...»</b>. Каждый совет кормит её Жертву. Она ищет не решение, а кого-то, кто разделит ответственность или заберёт работу.</p>
</div>

---

<!-- Итоги главы 2 — вариант 3 (slide 18, Леночка1.png) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Ладно, не буду терять время, пойду разбираться сама...</p>
</div>

---

<!-- Итоги главы 2 — вариант 1 (slide 18, Леночка2.png) -->
<!-- _class: ch2 -->
<img src="Леночка2.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Спасибо! Ты сам ничего толком не предложил — только поучал. Пойду разбираться сама.</p>
</div>

---

<!-- Итоги главы 2 — вариант 0 (slide 18, Леночка2.png) -->
<!-- _class: ch2 -->
<img src="Леночка2.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Спасибо, ты правда выручил! Одна я бы не разобралась.</p>
</div>

---

<!-- Теория к главе 2: Игра «Да, но...» (slide 19) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a5b4fc;">Теория к главе 2</div>
  <h2 style="color: #facc15; font-size: 1.5rem; margin: 0 0 12px 0;">Игра «Да, но...»</h2>
  <p style="font-size: 18px; color: #e2e8f0;"><strong>Что это за игра:</strong> снаружи — просьба о помощи (Взрослый — Взрослому), на деле — Ребёнок — Родитель. «Жертва» отвергает советы, чтобы доказать: «никто не может мне помочь». Цель — не решить задачу, а получить внимание и снять с себя ответственность, переложив работу на Спасателя.</p>
  <p style="font-size: 18px; color: #60a5fa;"><strong>Выход:</strong> не давать советов. Вернуть ответственность вопросом: «Как ты планируешь поступить?» — это включает в человеке Взрослого.</p>
</div>

---

<!-- Теория к главе 2: Кухня — разбор ситуации (slide 20) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a5b4fc;">Теория к главе 2</div>
  <h2 style="color: #facc15; font-size: 1.5rem; margin: 0 0 12px 0;">Кухня: разбор ситуации</h2>
  <p style="font-size: 18px; color: #e2e8f0;"><strong>Ситуация:</strong> Леночка на кухне жалуется на отчёт по регионам и просит совета. Каждый ваш совет («Power BI», «скопируй отчёт», «давай файл») она встречает «Да, но...» — так игра только крепнет.</p>
  <p style="font-size: 18px; color: #cbd5e1;"><strong>Корректный ход:</strong> в любой момент вернуть ответственность вопросами «Что ты планируешь делать?», «Какой у тебя план?» — без советов.</p>
  <p style="font-size: 17px; color: #94a3b8;"><strong>Итог:</strong> баллы начисляются, если вы вышли из игры. На будущее — остановитесь на вопросе «Как ты поступишь?».</p>
</div>

---

<!-- 6. Пояснение выбранного варианта гл.2, начисление баллов (slide 21) -->
<div class="dialog-box" style="margin-bottom: 50px;">
  <div class="name-tag">Итоги Главы 2: «Кухонная западня»</div>

  <p style="font-size: 20px; margin-bottom: 8px;"><strong>Ваш выбор: вариант 3 — возврат ответственности.</strong></p>

  <div class="points-outcome">
    <div class="points-rows">
      <div class="points-row"><span class="points-icon">💎</span> Осознанность: +<span class="points-num">25</span></div>
      <div class="points-row"><span class="points-icon">🔥</span> Влияние: +<span class="points-num">15</span></div>
      <div class="points-row"><span class="points-icon">🔋</span> Ресурс: +<span class="points-num">10</span></div>
    </div>
  </div>

  <p style="font-style: italic; color: #94a3b8; font-size: 18px; margin-top: 20px;">
    Блестяще! Вы не дали себя «съесть». Леночка в замешательстве — её обычный сценарий не сработал.
  </p>
</div>

---

<!-- В index.html далее: слайд 22 — заголовок «Финальный тест»; 23–25 — три вопроса квиза; 26 — сертификат «Поздравляем!», кнопка «Сформировать сертификат «Анти-манипулятор»». -->
