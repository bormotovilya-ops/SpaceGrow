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
    border: 2px solid #38bdf8;
    border-top: 4px solid #38bdf8;
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
    background: #38bdf8;
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
    border: 2px solid #38bdf8;
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
    background: #38bdf8;
    color: #0f172a;
    transform: scale(1.02);
  }

  .btn-choice.premium {
    border-color: #fbbf24;
    color: #fbbf24;
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
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
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(167, 139, 250, 0.2));
    border: 1px solid rgba(167, 139, 250, 0.45);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  }
  .points-outcome .points-icon { font-size: 1.4rem; }
  .points-outcome .points-num { min-width: 1.8em; text-align: right; color: #a78bfa; }
---

<!-- Соответствие index.html: слайды 0–2 — интро, Берн, «Что получите»; 3 — обложка гл.1; 4–7 — новелла гл.1; 8–10 — теория и баллы гл.1; 11 — обложка гл.2; 12–18 — новелла и итог гл.2; 19–21 — теория и баллы гл.2; 22–26 — квиз и сертификат. Всего 27 слайдов. Ассеты: boss..png, Леночка1.png, Леночка2.png, office.jpg, KITCHEN.png. -->

<!-- 1. Вступление, текущая ситуация (slide 4) -->
<div class="dialog-box">
  <div class="name-tag">Вы (мысли)</div>
  <p style="font-size: 26px;">17:50. Последние десять минут до свободы. План безупречен: исчезнуть из офиса раньше, чем реальность осознает мое отсутствие. Вечер обещает быть долгим и абсолютно нерабочим...</p>
</div>

---

<!-- 2. Появляется проблема (slide 5) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">О, [Имя]! Твое чутье тебя не подвело — ты еще здесь! Слушай, катастрофа планетарного масштаба. Только ты со своим стальным спокойствием вытащишь этот проект. Клиент в ярости, правки нужны к понедельнику. Не бросишь команду в беде?</p>
</div>

---

<!-- 3. Выбор варианта решения (slide 6) -->
<img src="boss..png" class="boss" style="filter: brightness(0.3) grayscale(100%);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">1. Конечно, Артур Борисович. Я всё сделаю, не переживайте.</div>
  <div class="btn-choice">2. Опять я?! У меня вообще-то личная жизнь есть!</div>
  <div class="btn-choice premium">3. Я готов спасти ситуацию. Как насчет премии или отгула за эти переработки?</div>
</div>

<div class="dialog-box" style="border-color: #fbbf24;">
  <div class="name-tag" style="background: #fbbf24;">Совет психолога</div>
  <p style="font-size: 20px; color: #cbd5e1;">Внимание: Артур Борисович использует игру из сценария «Загнанная лошадь»: смешивает лесть («ты лучший») с чувством вины («не бросишь команду»). Он ждет, что ты ответишь из позиции Послушного Ребенка. Твой ход?</p>
</div>

---

<!-- 4. Результат решения — вариант 3 (slide 7, success) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">Оу... Ты сразу берешь быка за рога. Ладно, справедливо. Если закроешь этот вопрос до утра понедельника — с меня отгул в любое время и бонус к квартальной премии. Договорились?</p>
</div>

---

<!-- 4. Результат — вариант 1: «Я так и знал...» (slide 7, wrong) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">Я так и знал, что на тебя можно положиться. Жду результат к понедельнику.</p>
</div>

---

<!-- 4. Результат — вариант 2: «Если к понедельнику...» (slide 7, wrong) -->
<img src="boss..png" class="boss" alt="" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">Если к понедельнику результата не будет — будем разбираться по-другому. На таких у меня времени нет.</p>
</div>

---

<!-- 5. Общая теория Э. Берна (slide 8) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a78bfa;">5. Общая теория Э. Берна на данную тему</div>
  <h2 style="color: #fbbf24; font-size: 1.5rem; margin: 0 0 12px 0;">Трое внутри тебя (Эрик Берн) 🧠</h2>
  <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 10px;">Психолог Эрик Берн описал три эго-состояния, из которых мы общаемся. В каждой ситуации «включается» одно из них.</p>
  <ul style="font-size: 17px; color: #cbd5e1;">
    <li><strong class="text-amber-400">Родитель</strong> — голос правил, долга, критики или опеки. В сценарии Артур Борисович давит из позиции Родителя и ждёт послушного Ребёнка.</li>
    <li><strong class="text-accent">Взрослый</strong> — опора на факты, переговоры. Вариант 3 в «Пятничном капкане» — ответ из Взрослого.</li>
    <li><strong class="text-green-400">Ребёнок</strong> — эмоции, страх или бунт. Вариант 1 — Послушный Ребёнок; вариант 2 — Бунтующий Ребёнок. Оба оставляют игру в силе.</li>
  </ul>
  <p style="font-size: 17px; color: #38bdf8;"><strong>Вывод:</strong> На работе выгоднее общаться Взрослый — Взрослый.</p>
</div>

---

<!-- 5. Общая теория — игра «Загнанная лошадь» (slide 9) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a78bfa;">5. Общая теория Э. Берна на данную тему</div>
  <h2 style="color: #fbbf24; font-size: 1.5rem; margin: 0 0 12px 0;">Что такое «Психологическая игра»? 🎭</h2>
  <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 10px;"><strong>Игра «Загнанная лошадь»:</strong> манипулятор выжимает из человека работу или уступки, не предлагая равного обмена. Смешивает <strong>лесть</strong>, <strong>чувство вины</strong> и <strong>срочность</strong>. Ждёт ответа из позиции Послушного Ребёнка: «Хорошо, я всё сделаю» — без условий.</p>
  <p style="font-size: 18px; color: #cbd5e1;"><strong>Что делал Артур Борисович:</strong> комплимент + давление виной + дедлайн. Цель — согласие на переработку без отгула и премии.</p>
  <p style="font-size: 17px; color: #38bdf8;"><strong>Выход:</strong> ответ из позиции Взрослый (вариант 3: переговоры) игру снимает.</p>
</div>

---

<!-- 6. Пояснение выбранного варианта, начисление баллов (slide 10) -->
<div class="dialog-box" style="margin-bottom: 50px;">
  <div class="name-tag">Итоги Главы 1: «Пятничный капкан»</div>

  <p style="font-size: 20px; margin-bottom: 8px;"><strong>Ваш выбор: вариант 3 — позиция Взрослого.</strong></p>
  <p style="font-size: 18px; color: #cbd5e1;">По Берну это ответ из эго-состояния Взрослый: вы перевели общение в переговоры и получили отгул и бонус.</p>

  <div class="points-outcome">
    <p style="font-size: 18px; color: #e2e8f0;"><strong>Начислено:</strong></p>
    <div class="points-rows">
      <div class="points-row"><span class="points-icon">💎</span> Осознанность: +<span class="points-num">20</span></div>
      <div class="points-row"><span class="points-icon">🔥</span> Влияние: +<span class="points-num">10</span></div>
      <div class="points-row"><span class="points-icon">🔋</span> Ресурс: +<span class="points-num">15</span></div>
    </div>
  </div>

  <p style="font-style: italic; color: #94a3b8; font-size: 18px; margin-top: 20px;">
    Блестяще! Вы не просто защитили свои границы, вы превратили манипуляцию в выгодную сделку.
  </p>
</div>

---

<!-- Обложка Глава 2 (slide 11) -->
<div class="dialog-box" style="text-align: center; justify-content: center; display: flex; flex-direction: column; align-items: center; min-height: 300px; margin-bottom: 100px;">
  <h1 style="color: #a78bfa; font-size: 60px; margin: 0;">ГЛАВА 2</h1>
  <h2 style="color: #38bdf8; font-size: 40px; margin: 10px 0;">«Кухонная западня»</h2>
  <div style="width: 100px; height: 4px; background: #fbbf24; margin: 20px 0;"></div>
  <p style="font-size: 22px; color: #cbd5e1;">Уровень сложности: <b>Средний</b></p>
</div>

---

<!-- Глава 2. Диалог 1 (slide 12) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Ой, привет... Как я тебе завидую, у тебя всегда всё по полочкам. А у меня этот отчёт по регионам... Сижу три часа, цифры просто плывут. Кажется, я завалю дедлайн и меня уничтожат.</p>
</div>

---

<!-- Глава 2. Ваш ответ 1 (slide 13) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" style="filter: brightness(0.5);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">Не паникуй. Попробуй выгрузить данные через Power BI, там всё само посчитается.</div>
  <div class="btn-choice">Да, ситуация сложная. И что ты планируешь делать?</div>
</div>

<div class="dialog-box">
  <div class="name-tag">Вы</div>
  <p style="font-size: 22px;">Нужно как-то подбодрить коллегу, она выглядит совсем потерянной...</p>
</div>

---

<!-- Глава 2. Диалог 2 (slide 14) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;"><strong>Да, но...</strong> наш айтишник сказал, что у меня старая версия, и она постоянно вылетает. Я боюсь, что если нажму не туда, всё вообще удалится!</p>
</div>

---

<!-- Глава 2. Ваш ответ 2 (slide 15) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" style="filter: brightness(0.5);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">Тогда просто скопируй прошлый отчёт и подставь цифры вручную.</div>
  <div class="btn-choice">Жаль. Похоже, тебе предстоит непростой вечер. Ладно, я пойду?</div>
</div>

<div class="dialog-box">
  <div class="name-tag">Вы</div>
  <p style="font-size: 22px;">Может, ручной способ ей поможет? Это же элементарно.</p>
</div>

---

<!-- Глава 2. Диалог 3 (slide 16) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;"><strong>Да, но...</strong> в прошлый раз там была ошибка в формуле, и шеф меня чуть не съел. Я теперь к тому файлу даже прикасаться боюсь... Может, ты взглянешь одним глазком? Ты же профи!</p>
</div>

---

<!-- Глава 2. Ваш ответ 3 (slide 17) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" style="filter: brightness(0.4) grayscale(100%);" alt="" />

<div class="choices-overlay">
  <div class="btn-choice">Ладно, давай файл, я быстро гляну формулы.</div>
  <div class="btn-choice">Хватит ныть, Лена! Просто сядь и сделай, там работы на час!</div>
  <div class="btn-choice premium">Понимаю твою тревогу. И какой у тебя план? Что будешь делать?</div>
</div>

<div class="dialog-box" style="border-color: #fbbf24;">
  <div class="name-tag" style="background: #fbbf24;">Совет психолога</div>
  <p style="font-size: 19px; color: #cbd5e1;">Леночка играет в <b>«Да, но...»</b>. Каждый твой совет — это еда для её Жертвы. Она не ищет решения, она ищет того, кто разделит с ней ответственность или заберёт работу.</p>
</div>

---

<!-- Итоги главы 2 — вариант 3 (slide 18, Леночка1.png) -->
<!-- _class: ch2 -->
<img src="Леночка1.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Ладно, не буду терять время, пойду разбираться, все равно...</p>
</div>

---

<!-- Итоги главы 2 — вариант 1 (slide 18, Леночка2.png) -->
<!-- _class: ch2 -->
<img src="Леночка2.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Спасибо! Ты сам-то ничего дельного не предложил — только указал, как надо. Пойду разбираться сама.</p>
</div>

---

<!-- Итоги главы 2 — вариант 0 (slide 18, Леночка2.png) -->
<!-- _class: ch2 -->
<img src="Леночка2.png" class="character" alt="" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">Спасибо, ты правда выручил! Я бы одна ни за что не разобралась.</p>
</div>

---

<!-- Теория к главе 2: Игра «Да, но...» (slide 19) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a78bfa;">Теория к главе 2</div>
  <h2 style="color: #fbbf24; font-size: 1.5rem; margin: 0 0 12px 0;">Игра «Да, но...»</h2>
  <p style="font-size: 18px; color: #e2e8f0;"><strong>Что это за игра:</strong> Внешне выглядит как запрос о помощи (Взрослый — Взрослому). На самом деле это трансакция Ребёнок — Родитель. Игрок в роли «Жертвы» отвергает все советы, чтобы доказать: «никто не может мне помочь». Цель — не решить задачу, а получить внимание, снять с себя ответственность или переложить работу на Спасателя.</p>
  <p style="font-size: 18px; color: #38bdf8;"><strong>Выход:</strong> Не давать советов. Вернуть ответственность вопросом: «И как ты планируешь поступить?» — это вынуждает человека включить своего Взрослого.</p>
</div>

---

<!-- Теория к главе 2: Кухня — разбор ситуации (slide 20) -->
<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a78bfa;">Теория к главе 2</div>
  <h2 style="color: #fbbf24; font-size: 1.5rem; margin: 0 0 12px 0;">Кухня: разбор ситуации</h2>
  <p style="font-size: 18px; color: #e2e8f0;"><strong>Ситуация:</strong> Леночка на кухне жалуется на отчёт по регионам и просит по сути совета или помощи. Каждый ваш совет («Power BI», «скопируй прошлый отчёт», «давай файл») она парирует «Да, но...» — так игра укрепляется.</p>
  <p style="font-size: 18px; color: #cbd5e1;"><strong>Корректный ход:</strong> В любой момент можно было вернуть ответственность: «И что ты планируешь делать?», «Какой у тебя план?» — без советов.</p>
  <p style="font-size: 17px; color: #94a3b8;"><strong>Итог:</strong> Баллы начисляются, если вы вышли из игры. На будущее: остановитесь на вопросе «И как ты поступишь?».</p>
</div>

---

<!-- 6. Пояснение выбранного варианта гл.2, начисление баллов (slide 21) -->
<div class="dialog-box" style="margin-bottom: 50px;">
  <div class="name-tag">Итоги Главы 2: «Кухонная западня»</div>

  <p style="font-size: 20px; margin-bottom: 8px;"><strong>Ваш выбор: Вариант 3 — Возврат ответственности.</strong></p>

  <div class="points-outcome">
    <div class="points-rows">
      <div class="points-row"><span class="points-icon">💎</span> Осознанность: +<span class="points-num">25</span></div>
      <div class="points-row"><span class="points-icon">🔥</span> Влияние: +<span class="points-num">15</span></div>
      <div class="points-row"><span class="points-icon">🔋</span> Ресурс: +<span class="points-num">10</span></div>
    </div>
  </div>

  <p style="font-style: italic; color: #94a3b8; font-size: 18px; margin-top: 20px;">
    Блестяще! Вы не дали себя «съесть». Леночка в замешательстве — её привычный сценарий не сработал.
  </p>
</div>

---

<!-- В index.html далее: слайд 22 — заголовок «Финальный тест»; 23–25 — три вопроса квиза; 26 — сертификат «Поздравляем!», кнопка «Сформировать сертификат «Анти-манипулятор»». -->
