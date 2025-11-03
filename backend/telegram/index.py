"""
Business: Telegram bot integration with webhook for task notifications and commands
Args: event with httpMethod, body (Telegram webhook updates)
Returns: HTTP response acknowledging webhook or command results
"""

import json
import os
from typing import Dict, Any, Optional
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import requests
except ImportError:
    psycopg2 = None
    requests = None

DATABASE_URL = os.environ.get('DATABASE_URL')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

def get_db_connection():
    if not psycopg2 or not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def send_telegram_message(chat_id: str, text: str, parse_mode: str = 'HTML'):
    if not TELEGRAM_BOT_TOKEN or not requests:
        return False
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        
        if 'message' in body_data:
            message = body_data['message']
            chat_id = str(message.get('chat', {}).get('id', ''))
            text = message.get('text', '')
            user = message.get('from', {})
            
            conn = get_db_connection()
            if not conn:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}
            
            cursor = conn.cursor()
            
            if text.startswith('/start'):
                cursor.execute(
                    "SELECT user_id FROM integrations_telegram WHERE chat_id = %s",
                    (chat_id,)
                )
                existing = cursor.fetchone()
                
                if existing:
                    send_telegram_message(
                        chat_id,
                        "✅ Ваш аккаунт уже подключен!\n\n"
                        "Доступные команды:\n"
                        "/new - создать задачу\n"
                        "/list - показать задачи\n"
                        "/help - справка"
                    )
                else:
                    send_telegram_message(
                        chat_id,
                        f"👋 Привет! Я бот для управления задачами.\n\n"
                        f"Ваш Chat ID: <code>{chat_id}</code>\n\n"
                        f"Скопируйте Chat ID и подключите бота в настройках приложения."
                    )
            
            elif text.startswith('/new'):
                cursor.execute(
                    "SELECT user_id FROM integrations_telegram WHERE chat_id = %s AND enabled = true",
                    (chat_id,)
                )
                integration = cursor.fetchone()
                
                if not integration:
                    send_telegram_message(chat_id, "❌ Сначала подключите бота в приложении")
                else:
                    task_text = text[4:].strip()
                    if task_text:
                        cursor.execute(
                            "INSERT INTO tasks (user_id, title, status) VALUES (%s, %s, %s) RETURNING id",
                            (integration['user_id'], task_text, 'inbox')
                        )
                        task = cursor.fetchone()
                        conn.commit()
                        send_telegram_message(chat_id, f"✅ Задача создана! ID: {task['id']}")
                    else:
                        send_telegram_message(chat_id, "Использование: /new Текст задачи")
            
            elif text.startswith('/list'):
                cursor.execute(
                    "SELECT user_id FROM integrations_telegram WHERE chat_id = %s AND enabled = true",
                    (chat_id,)
                )
                integration = cursor.fetchone()
                
                if not integration:
                    send_telegram_message(chat_id, "❌ Сначала подключите бота в приложении")
                else:
                    cursor.execute(
                        """
                        SELECT id, title, status, priority, due_at
                        FROM tasks
                        WHERE user_id = %s AND status != 'done' AND status != 'archived'
                        ORDER BY due_at ASC NULLS LAST, created_at DESC
                        LIMIT 10
                        """,
                        (integration['user_id'],)
                    )
                    tasks = cursor.fetchall()
                    
                    if tasks:
                        message_text = "📋 <b>Ваши задачи:</b>\n\n"
                        for task in tasks:
                            priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(task['priority'], '⚪')
                            message_text += f"{priority_emoji} <b>#{task['id']}</b> {task['title']}\n"
                            if task['due_at']:
                                message_text += f"   📅 {task['due_at']}\n"
                        send_telegram_message(chat_id, message_text)
                    else:
                        send_telegram_message(chat_id, "✨ Задач нет! Всё сделано.")
            
            elif text.startswith('/help'):
                send_telegram_message(
                    chat_id,
                    "<b>📖 Команды бота:</b>\n\n"
                    "/start - подключение аккаунта\n"
                    "/new Текст - создать задачу\n"
                    "/list - показать активные задачи\n"
                    "/help - эта справка"
                )
            
            else:
                send_telegram_message(chat_id, "Не понял команду. Используйте /help")
            
            cursor.close()
            conn.close()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'ok': True})
        }
    
    except Exception as e:
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'ok': True, 'error': str(e)})
        }
