# -*- coding: utf-8 -*-
"""
Генератор JSON структуры для draw.io на основе описания интерфейса
"""
import json
from datetime import datetime

def create_drawio_json(description_data):
    """
    Создает JSON структуру для draw.io на основе описания
    
    description_data - словарь с описанием элементов
    """
    
    # Базовая структура
    drawio_data = {
        "version": "1.0",
        "created": datetime.now().isoformat(),
        "type": "wireframe",
        "screen": {
            "name": description_data.get("screen_name", "Главный экран MiniApp"),
            "width": description_data.get("width", 375),
            "height": description_data.get("height", 812),
            "background": description_data.get("background", "#0a0a0f"),
            "orientation": description_data.get("orientation", "portrait")
        },
        "elements": [],
        "layout": description_data.get("layout", {
            "type": "absolute",
            "direction": "column"
        }),
        "notes": description_data.get("notes", "")
    }
    
    # Обрабатываем элементы
    elements = description_data.get("elements", [])
    for idx, elem in enumerate(elements):
        element = {
            "id": f"element_{idx + 1}",
            "type": elem.get("type", "component"),
            "name": elem.get("name", f"Элемент {idx + 1}"),
            "x": elem.get("x", 0),
            "y": elem.get("y", 0),
            "width": elem.get("width", 100),
            "height": elem.get("height", 50),
            "properties": {
                "backgroundColor": elem.get("backgroundColor", "#ffffff"),
                "textColor": elem.get("textColor", "#000000"),
                "borderColor": elem.get("borderColor", "#cccccc"),
                "borderWidth": elem.get("borderWidth", 0),
                "borderRadius": elem.get("borderRadius", 0),
                "fontSize": elem.get("fontSize", 16),
                "fontWeight": elem.get("fontWeight", "normal"),
                "textAlign": elem.get("textAlign", "center"),
                "padding": elem.get("padding", 10),
                "opacity": elem.get("opacity", 1.0)
            },
            "content": {
                "text": elem.get("text", ""),
                "image": elem.get("image", None),
                "icon": elem.get("icon", None)
            },
            "actions": {
                "onClick": elem.get("onClick", ""),
                "onHover": elem.get("onHover", "")
            },
            "position": {
                "type": elem.get("positionType", "absolute"),
                "top": elem.get("top", None),
                "right": elem.get("right", None),
                "bottom": elem.get("bottom", None),
                "left": elem.get("left", None),
                "center": elem.get("center", False)
            },
            "zIndex": elem.get("zIndex", idx + 1)
        }
        
        drawio_data["elements"].append(element)
    
    return drawio_data

def save_json(data, filename="interface_drawio.json"):
    """Сохраняет JSON в файл"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ JSON сохранен в {filename}")

if __name__ == "__main__":
    # Пример использования
    example = {
        "screen_name": "Главный экран MiniApp",
        "width": 375,
        "height": 812,
        "background": "#0a0a0f",
        "layout": {
            "type": "absolute"
        },
        "elements": [
            {
                "name": "Центральное фото",
                "type": "image",
                "x": 107.5,
                "y": 326,
                "width": 160,
                "height": 160,
                "borderRadius": 80,
                "center": True
            }
        ]
    }
    
    result = create_drawio_json(example)
    save_json(result)


