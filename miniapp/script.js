/* === САЙДБАР === */
const sidebar = document.getElementById("sidebar");
const sidebarContent = document.getElementById("sidebar-content");
const sidebarTitle = document.getElementById("sidebar-title");
const closeSidebar = document.getElementById("close-sidebar");

function openSidebar(title, items) {
    sidebarTitle.textContent = title;
    sidebarContent.innerHTML = items.map(i => `<div class="submenu-item">${i}</div>`).join("");
    sidebar.classList.add("visible");
}

closeSidebar.onclick = () => sidebar.classList.remove("visible");


/* === 6 ПУНКТОВ МЕНЮ === */
document.querySelector(".menu-1").onclick = () =>
    openSidebar("Что я делаю", [
        "Разработка MiniApps",
        "Создание Telegram-ботов",
        "AI-интеграции",
        "Автоматизация процессов"
    ]);

document.querySelector(".menu-2").onclick = () =>
    openSidebar("Портфолио", [
        "MiniApps проекты",
        "AI-боты",
        "Корпоративные интеграции"
    ]);

document.querySelector(".menu-3").onclick = () =>
    openSidebar("Отзывы", [
        "Клиенты о работе",
        "Видео-отзывы",
        "Кейсы до/после"
    ]);

document.querySelector(".menu-4").onclick = () =>
    openSidebar("Контакты", [
        "Telegram: @ilyaborm",
        "Канал",
        "Мой сайт",
        "VK"
    ]);

document.querySelector(".menu-5").onclick = () =>
    openSidebar("Обо мне", [
        "Опыт",
        "Миссия",
        "История",
        "Философия"
    ]);

document.querySelector(".menu-6").onclick = () =>
    openSidebar("AI-инструменты", [
        "Нейронные модели",
        "Генерация медиа",
        "Автоматизация",
        "ChatGPT-плагины"
    ]);


/* === ИДЕАЛЬНАЯ СИММЕТРИЯ: РАССТАНОВКА ПО КРУГУ === */

function placeMenuItemsCircular() {
    const container = document.querySelector('.container');

    const crect = container.getBoundingClientRect();
    const cx = crect.width / 2;
    const cy = crect.height / 2;

    const items = document.querySelectorAll(".menu-item");
    const count = items.length;

    // Радиус (универсальный, под MiniApp)
    const radius = Math.min(crect.width, crect.height) * 0.34;

    // стартовый угол — чтобы верхняя кнопка ушла в левый верх
    const startAngle = -110; // можешь менять ±10° для вкуса

    items.forEach((item, i) => {
        const angleDeg = startAngle + i * (360 / count);
        const angleRad = angleDeg * Math.PI / 180;

        const x = cx + radius * Math.cos(angleRad);
        const y = cy + radius * Math.sin(angleRad);

        item.style.left = x + "px";
        item.style.top = y + "px";
        item.style.transform = "translate(-50%, -50%)";
    });
}

window.addEventListener("load", placeMenuItemsCircular);
window.addEventListener("resize", placeMenuItemsCircular);
