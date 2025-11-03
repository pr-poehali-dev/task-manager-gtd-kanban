"""
Business: Authentication API with email+password and optional Google OAuth
Args: event with httpMethod, body (email/password or googleToken)
Returns: HTTP response with JWT tokens or error
"""

import json
import os
import re
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import secrets
import base64

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None

DATABASE_URL = os.environ.get('DATABASE_URL')
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
AUTH_GOOGLE_ENABLED = os.environ.get('AUTH_GOOGLE_ENABLED', 'false').lower() == 'true'

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${base64.b64encode(pwd_hash).decode('utf-8')}"

def verify_password(password: str, hash_str: str) -> bool:
    parts = hash_str.split('$')
    if len(parts) != 2:
        return False
    salt, stored_hash = parts
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return base64.b64encode(pwd_hash).decode('utf-8') == stored_hash

def create_jwt(user_id: int, email: str, expires_minutes: int = 60) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip('=')
    payload_data = {
        "user_id": user_id,
        "email": email,
        "exp": int((datetime.utcnow() + timedelta(minutes=expires_minutes)).timestamp())
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip('=')
    signature_input = f"{header}.{payload}"
    signature = base64.urlsafe_b64encode(
        hashlib.sha256(f"{signature_input}{JWT_SECRET}".encode()).digest()
    ).decode().rstrip('=')
    return f"{header}.{payload}.{signature}"

def create_refresh_token() -> str:
    return secrets.token_urlsafe(32)

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def get_db_connection():
    if not psycopg2 or not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action', '')
        
        conn = get_db_connection()
        if not conn:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Database connection failed'})
            }
        
        cursor = conn.cursor()
        
        if action == 'register':
            email = body_data.get('email', '').strip().lower()
            password = body_data.get('password', '')
            full_name = body_data.get('fullName', '')
            
            if not validate_email(email):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid email format'})
                }
            
            if len(password) < 6:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Password must be at least 6 characters'})
                }
            
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return {
                    'statusCode': 409,
                    'headers': headers,
                    'body': json.dumps({'error': 'Email already registered'})
                }
            
            password_hash = hash_password(password)
            cursor.execute(
                "INSERT INTO users (email, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id, email, full_name",
                (email, password_hash, full_name)
            )
            user = cursor.fetchone()
            conn.commit()
            
            access_token = create_jwt(user['id'], user['email'], 60)
            refresh_token = create_refresh_token()
            
            cursor.execute(
                "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user['id'], refresh_token, datetime.utcnow() + timedelta(days=30))
            )
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'fullName': user['full_name']
                    },
                    'accessToken': access_token,
                    'refreshToken': refresh_token
                })
            }
        
        elif action == 'login':
            email = body_data.get('email', '').strip().lower()
            password = body_data.get('password', '')
            
            cursor.execute(
                "SELECT id, email, password_hash, full_name FROM users WHERE email = %s",
                (email,)
            )
            user = cursor.fetchone()
            
            if not user or not user['password_hash'] or not verify_password(password, user['password_hash']):
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid email or password'})
                }
            
            access_token = create_jwt(user['id'], user['email'], 60)
            refresh_token = create_refresh_token()
            
            cursor.execute(
                "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user['id'], refresh_token, datetime.utcnow() + timedelta(days=30))
            )
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'fullName': user['full_name']
                    },
                    'accessToken': access_token,
                    'refreshToken': refresh_token
                })
            }
        
        elif action == 'google_login' and AUTH_GOOGLE_ENABLED:
            google_token = body_data.get('googleToken', '')
            
            return {
                'statusCode': 501,
                'headers': headers,
                'body': json.dumps({'error': 'Google OAuth not implemented yet'})
            }
        
        elif action == 'refresh':
            refresh_token = body_data.get('refreshToken', '')
            
            cursor.execute(
                "SELECT rt.user_id, u.email, u.full_name FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = %s AND rt.revoked = false AND rt.expires_at > NOW()",
                (refresh_token,)
            )
            token_data = cursor.fetchone()
            
            if not token_data:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid or expired refresh token'})
                }
            
            access_token = create_jwt(token_data['user_id'], token_data['email'], 60)
            new_refresh_token = create_refresh_token()
            
            cursor.execute("UPDATE refresh_tokens SET revoked = true WHERE token = %s", (refresh_token,))
            cursor.execute(
                "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (token_data['user_id'], new_refresh_token, datetime.utcnow() + timedelta(days=30))
            )
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'accessToken': access_token,
                    'refreshToken': new_refresh_token
                })
            }
        
        else:
            cursor.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid action or Google OAuth disabled'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
