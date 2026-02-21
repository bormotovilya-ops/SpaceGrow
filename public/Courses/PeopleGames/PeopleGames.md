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
    background-image: url('ФОН_ОФИСА.jpg');
    background-size: cover;
    background-position: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  /* Персонаж: Артур Борисович */
  .boss {
    position: absolute;
    bottom: 0;
    right: 5%;
    height: 90%;
    z-index: 1;
    transition: all 0.5s ease;
  }

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

  /* Блок начисления баллов: каждая строка по очереди */
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
    opacity: 0;
    transform: translateY(14px);
    animation: points-row-in 0.45s ease-out forwards;
  }
  .points-outcome .points-row:nth-child(1) { animation-delay: 0.3s; }
  .points-outcome .points-row:nth-child(2) { animation-delay: 0.75s; }
  .points-outcome .points-row:nth-child(3) { animation-delay: 1.2s; }
  @keyframes points-row-in {
    to { opacity: 1; transform: translateY(0); }
  }
  .points-outcome .points-icon { font-size: 1.4rem; }
  .points-outcome .points-num {
    display: inline-block;
    min-width: 1.8em;
    text-align: right;
    color: #a78bfa;
    opacity: 0;
    transform: scale(0.4);
    animation: points-num-pop 0.6s ease-out forwards;
  }
  .points-outcome .points-row:nth-child(1) .points-num { animation-delay: 0.5s; }
  .points-outcome .points-row:nth-child(2) .points-num { animation-delay: 0.95s; }
  .points-outcome .points-row:nth-child(3) .points-num { animation-delay: 1.4s; }
  @keyframes points-num-pop {
    0% { opacity: 0; transform: scale(0.4); }
    70% { opacity: 1; transform: scale(1.12); }
    100% { opacity: 1; transform: scale(1); }
  }
---

<div class="dialog-box">
  <div class="name-tag">Вы (мысли)</div>
  <p style="font-size: 26px;">17:50. Последние десять минут до свободы. План безупречен: исчезнуть из офиса раньше, чем реальность осознает мое отсутствие. Вечер обещает быть долгим и абсолютно нерабочим...</p>
</div>

---

<img src="БОСС_БЕЗ_ФОНА.png" class="boss" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">«О, [Имя]! Твое чутье тебя не подвело — ты еще здесь! Слушай, катастрофа планетарного масштаба. Только ты со своим стальным спокойствием вытащишь этот проект. Клиент в ярости, правки нужны к понедельнику. Не бросишь команду в беде?»</p>
</div>

---

<img src="БОСС_БЕЗ_ФОНА.png" class="boss" style="filter: brightness(0.3) grayscale(100%);" />

<div class="choices-overlay">
  <div class="btn-choice">1. «Конечно, Артур Борисович. Я всё сделаю, не переживайте».</div>
  <div class="btn-choice">2. «Опять я?! У меня вообще-то личная жизнь есть!»</div>
  <div class="btn-choice premium">3. 💎 (10) «Я готов спасти ситуацию. Как насчет премии или отгула за эти переработки?»</div>
</div>

<div class="dialog-box" style="border-color: #fbbf24;">
  <div class="name-tag" style="background: #fbbf24;">Линза Психолога</div>
  <p style="font-size: 20px; color: #cbd5e1;">Внимание: Артур Борисович использует игру <b>«Загнанная лошадь»</b>. Он смешивает лесть («ты лучший») с чувством вины («не бросишь команду»). Он ждет, что ты ответишь из позиции Послушного Ребенка. Твой ход?</p>
</div>

---

<img src="БОСС_БЕЗ_ФОНА.png" class="boss" />

<div class="dialog-box">
  <div class="name-tag">Артур Борисович</div>
  <p style="font-size: 24px;">«Оу... Ты сразу берешь быка за рога. Ладно, справедливо. Если закроешь этот вопрос до утра понедельника — с меня отгул в любое время и бонус к квартальной премии. Договорились? </p>
</div>

---

<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a78bfa;">Теория к главе 1</div>
  <h2 style="color: #fbbf24; font-size: 1.5rem; margin: 0 0 12px 0;">Игра «Загнанная лошадь»</h2>
  <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 10px;"><strong>Суть игры (по Берну):</strong> манипулятор выжимает из человека работу или уступки без равного обмена. Он смешивает <strong>лесть</strong> («только ты справишься», «ты лучший») с <strong>чувством вины</strong> («не бросишь команду», «все на тебя надеются») и <strong>срочностью</strong>. Ожидается ответ из позиции Послушного Ребёнка: «Хорошо, я всё сделаю» — без условий.</p>
  <p style="font-size: 18px; color: #cbd5e1; margin-bottom: 10px;"><strong>Что делал Артур Борисович:</strong> включил именно эту игру. Комплимент («твоё чутьё», «стальное спокойствие») + давление виной («не бросишь команду в беде») + дедлайн («к понедельнику»). Цель — получить твоё согласие на переработку без отгула и премии.</p>
  <p style="font-size: 17px; color: #38bdf8;"><strong>Выход:</strong> ответ из позиции Взрослого (переговоры, условия) игру снимает — манипулятору не за что зацепиться, приходится договариваться по-настоящему.</p>
</div>

---

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
    Блестяще! Вы не просто защитили свои границы, вы превратили манипуляцию в выгодную сделку. Артур Борисович теперь видит в вас не "удобного сотрудника", а равноправного партнера.
  </p>
</div>

---

<div class="dialog-box" style="text-align: center; justify-content: center; display: flex; flex-direction: column; align-items: center; min-height: 300px; margin-bottom: 100px;">
  <h1 style="color: #a78bfa; font-size: 60px; margin: 0;">ГЛАВА 2</h1>
  <h2 style="color: #38bdf8; font-size: 40px; margin: 10px 0;">«Кухонная западня»</h2>
  <div style="width: 100px; height: 4px; background: #fbbf24; margin: 20px 0;"></div>
  <p style="font-size: 22px; color: #cbd5e1;">Уровень сложности: <b>Средний</b><br>Цель: Сохранить ресурс и не провалиться в роль «Спасателя»</p>
</div>

---

<img src="ЛЕНОЧКА.png" class="character" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">«Ой, привет... Как я тебе завидую, у тебя всегда всё по полочкам. А у меня этот отчет по регионам... Сижу три часа, цифры просто плывут. Кажется, я завалю дедлайн и меня уничтожат».</p>
</div>

---

<img src="ЛЕНОЧКА.png" class="character" style="filter: brightness(0.5);" />

<div class="choices-overlay">
  <div class="btn-choice">1. «Не паникуй. Попробуй выгрузить данные через Power BI, там всё само посчитается».</div>
  <div class="btn-choice">2. «Да, ситуация сложная. И что ты планируешь делать?»</div>
</div>

<div class="dialog-box">
  <div class="name-tag">Вы</div>
  <p style="font-size: 22px;">Нужно как-то подбодрить коллегу, она выглядит совсем потерянной...</p>
</div>

---

<img src="ЛЕНОЧКА.png" class="character" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">«<b>Да, но...</b> наш айтишник сказал, что у меня старая версия, и она постоянно вылетает. Я боюсь, что если нажму не туда, всё вообще удалится!»</p>
  <div class="points-row" style="color: #f87171; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4); display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; margin-top: 10px; font-weight: bold;">
    <span class="points-icon">🔋</span> Ресурс: -5 (Вы начали тратить силы на решение чужой задачи)
  </div>
</div>

---

<img src="ЛЕНОЧКА.png" class="character" style="filter: brightness(0.5);" />

<div class="choices-overlay">
  <div class="btn-choice">1. «Тогда просто скопируй прошлый отчет и подставь цифры вручную».</div>
  <div class="btn-choice">2. «Жаль. Похоже, тебе предстоит непростой вечер. Ладно, я пойду?»</div>
</div>

<div class="dialog-box">
  <div class="name-tag">Вы</div>
  <p style="font-size: 22px;">Может, ручной способ ей поможет? Это же элементарно.</p>
</div>

---

<img src="ЛЕНОЧКА.png" class="character" />

<div class="dialog-box">
  <div class="name-tag">Леночка</div>
  <p style="font-size: 24px;">«<b>Да, но...</b> в прошлый раз там была ошибка в формуле, и шеф меня чуть не съел. Я теперь к тому файлу даже прикасаться боюсь... Может, ты взглянешь одним глазком? Ты же профи!»</p>
  <div class="points-row" style="color: #f87171; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4); display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; margin-top: 10px; font-weight: bold;">
    <span class="points-icon">🔥</span> Влияние: -5 | 🔋 Ресурс: -10
  </div>
</div>

---

<img src="ЛЕНОЧКА.png" class="character" style="filter: brightness(0.4) grayscale(100%);" />

<div class="choices-overlay">
  <div class="btn-choice">1. «Ладно, давай файл, я быстро гляну формулы».</div>
  <div class="btn-choice">2. «Хватит ныть, Лена! Просто сядь и сделай, там работы на час!»</div>
  <div class="btn-choice premium">3. 💎 (10) «Понимаю твою тревогу. И какой у тебя план? Что будешь делать?»</div>
</div>

<div class="dialog-box" style="border-color: #fbbf24;">
  <div class="name-tag" style="background: #fbbf24;">Линза Психолога</div>
  <p style="font-size: 19px; color: #cbd5e1;">Леночка играет в <b>«Да, но...»</b>. Каждый твой совет — это еда для её Жертвы. Она не ищет решения, она ищет того, кто разделит с ней ответственность или заберет работу.</p>
</div>

---

<div class="dialog-box" style="margin-bottom: 30px;">
  <div class="name-tag" style="background: #a78bfa;">Теория: Игра «Да, но...»</div>
  <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 10px;"><strong>Суть игры:</strong> Внешне это выглядит как запрос о помощи (Взрослый — Взрослому). Но на самом деле это трансакция Ребенок — Родитель. Игрок («Жертва») отвергает все советы, чтобы доказать: «никто не может мне помочь».</p>
  <p style="font-size: 18px; color: #cbd5e1; margin-bottom: 10px;"><strong>Выход:</strong> Не давать советов. Вернуть ответственность вопросом: «И как ты планируешь поступить?». Это вынуждает человека включить своего Взрослого.</p>
</div>

---

<div class="dialog-box" style="margin-bottom: 50px;">
  <div class="name-tag">Итоги Главы 2: «Черная дыра советов»</div>

  <p style="font-size: 20px; margin-bottom: 8px;"><strong>Ваш выбор: Вариант 3 — Возврат ответственности.</strong></p>

  <div class="points-outcome">
    <div class="points-rows" style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
      <div class="points-row" style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(167, 139, 250, 0.2)); border: 1px solid rgba(167, 139, 250, 0.45);"><span class="points-icon">💎</span> Осознанность: +<span class="points-num">25</span></div>
      <div class="points-row" style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(167, 139, 250, 0.2)); border: 1px solid rgba(167, 139, 250, 0.45);"><span class="points-icon">🔥</span> Влияние: +<span class="points-num">15</span></div>
      <div class="points-row" style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(167, 139, 250, 0.2)); border: 1px solid rgba(167, 139, 250, 0.45);"><span class="points-icon">🔋</span> Ресурс: +<span class="points-num">10</span></div>
    </div>
  </div>

  <p style="font-style: italic; color: #94a3b8; font-size: 18px; margin-top: 20px;">
    Блестяще! Вы не дали себя «съесть». Леночка в замешательстве — её привычный сценарий не сработал. Теперь ей придется либо реально делать отчет, либо искать другого "Спасателя".
  </p>
</div>