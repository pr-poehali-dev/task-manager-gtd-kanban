"""
Business: Task management API - CRUD operations for tasks, projects, contexts
Args: event with httpMethod, body (task data), headers (X-Auth-Token)
Returns: HTTP response with task/project data or error
"""

import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
import base64
import hashlib

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None

DATABASE_URL = os.environ.get('DATABASE_URL')
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')

def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header, payload, signature = parts
        signature_input = f"{header}.{payload}"
        expected_signature = base64.urlsafe_b64encode(
            hashlib.sha256(f"{signature_input}{JWT_SECRET}".encode()).digest()
        ).decode().rstrip('=')
        
        if signature != expected_signature:
            return None
        
        payload_data = json.loads(base64.urlsafe_b64decode(payload + '=='))
        
        if payload_data.get('exp', 0) < datetime.utcnow().timestamp():
            return None
        
        return payload_data
    except Exception:
        return None

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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    auth_token = event.get('headers', {}).get('x-auth-token', '')
    user_data = verify_jwt(auth_token)
    
    if not user_data:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    user_id = user_data['user_id']
    
    try:
        conn = get_db_connection()
        if not conn:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Database connection failed'})
            }
        
        cursor = conn.cursor()
        
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            resource = params.get('resource', 'tasks')
            
            if resource == 'tasks':
                filters = []
                values = [user_id]
                
                status = params.get('status')
                if status:
                    filters.append(f"status = ${len(values) + 1}")
                    values.append(status)
                
                project_id = params.get('projectId')
                if project_id:
                    filters.append(f"project_id = ${len(values) + 1}")
                    values.append(int(project_id))
                
                priority = params.get('priority')
                if priority:
                    filters.append(f"priority = ${len(values) + 1}")
                    values.append(priority)
                
                quadrant = params.get('quadrant')
                if quadrant:
                    filters.append(f"eisenhower_quadrant = ${len(values) + 1}")
                    values.append(quadrant)
                
                where_clause = "user_id = %s"
                if filters:
                    where_clause += " AND " + " AND ".join(filters).replace('$', '%s').replace('%s1', '%s').replace('%s2', '%s').replace('%s3', '%s').replace('%s4', '%s')
                
                cursor.execute(
                    f"""
                    SELECT t.*, 
                           json_build_object('id', p.id, 'name', p.name, 'color', p.color) as project,
                           json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as context,
                           (SELECT json_agg(json_build_object('id', s.id, 'title', s.title, 'completed', s.completed, 'sortOrder', s.sort_order))
                            FROM subtasks s WHERE s.task_id = t.id ORDER BY s.sort_order) as subtasks
                    FROM tasks t
                    LEFT JOIN projects p ON t.project_id = p.id
                    LEFT JOIN contexts c ON t.context_id = c.id
                    WHERE {where_clause}
                    ORDER BY t.created_at DESC
                    LIMIT 100
                    """,
                    values
                )
                tasks = cursor.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps([dict(task) for task in tasks], default=str)
                }
            
            elif resource == 'projects':
                cursor.execute(
                    """
                    SELECT p.*, 
                           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
                    FROM projects p
                    WHERE p.owner_id = %s OR p.id IN (SELECT project_id FROM project_members WHERE user_id = %s)
                    ORDER BY p.created_at DESC
                    """,
                    (user_id, user_id)
                )
                projects = cursor.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps([dict(p) for p in projects], default=str)
                }
            
            elif resource == 'contexts':
                cursor.execute("SELECT * FROM contexts WHERE user_id = %s ORDER BY name", (user_id,))
                contexts = cursor.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps([dict(c) for c in contexts], default=str)
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            resource = body_data.get('resource', 'task')
            
            if resource == 'task':
                title = body_data.get('title', '').strip()
                if not title:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Title is required'})
                    }
                
                cursor.execute(
                    """
                    INSERT INTO tasks (
                        user_id, project_id, title, description, status, priority,
                        eisenhower_quadrant, kanban_column, due_at, remind_at,
                        context_id, tags, source_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        user_id,
                        body_data.get('projectId'),
                        title,
                        body_data.get('description', ''),
                        body_data.get('status', 'inbox'),
                        body_data.get('priority', 'medium'),
                        body_data.get('eisenhowerQuadrant'),
                        body_data.get('kanbanColumn', 'todo'),
                        body_data.get('dueAt'),
                        body_data.get('remindAt'),
                        body_data.get('contextId'),
                        body_data.get('tags', []),
                        body_data.get('sourceUrl', '')
                    )
                )
                task = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps(dict(task), default=str)
                }
            
            elif resource == 'project':
                name = body_data.get('name', '').strip()
                if not name:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Project name is required'})
                    }
                
                cursor.execute(
                    """
                    INSERT INTO projects (owner_id, name, description, color, visibility)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (user_id, name, body_data.get('description', ''), body_data.get('color', '#3B82F6'), body_data.get('visibility', 'private'))
                )
                project = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps(dict(project), default=str)
                }
            
            elif resource == 'context':
                name = body_data.get('name', '').strip()
                if not name:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Context name is required'})
                    }
                
                cursor.execute(
                    "INSERT INTO contexts (user_id, name, icon) VALUES (%s, %s, %s) RETURNING *",
                    (user_id, name, body_data.get('icon', ''))
                )
                ctx = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps(dict(ctx), default=str)
                }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            task_id = body_data.get('id')
            
            if not task_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Task ID is required'})
                }
            
            update_fields = []
            values = []
            
            if 'title' in body_data:
                update_fields.append(f"title = %s")
                values.append(body_data['title'])
            if 'description' in body_data:
                update_fields.append(f"description = %s")
                values.append(body_data['description'])
            if 'status' in body_data:
                update_fields.append(f"status = %s")
                values.append(body_data['status'])
            if 'priority' in body_data:
                update_fields.append(f"priority = %s")
                values.append(body_data['priority'])
            if 'eisenhowerQuadrant' in body_data:
                update_fields.append(f"eisenhower_quadrant = %s")
                values.append(body_data['eisenhowerQuadrant'])
            if 'kanbanColumn' in body_data:
                update_fields.append(f"kanban_column = %s")
                values.append(body_data['kanbanColumn'])
            if 'dueAt' in body_data:
                update_fields.append(f"due_at = %s")
                values.append(body_data['dueAt'])
            if 'projectId' in body_data:
                update_fields.append(f"project_id = %s")
                values.append(body_data['projectId'])
            
            update_fields.append("updated_at = NOW()")
            
            values.extend([user_id, task_id])
            
            cursor.execute(
                f"""
                UPDATE tasks SET {', '.join(update_fields)}
                WHERE user_id = %s AND id = %s
                RETURNING *
                """,
                values
            )
            task = cursor.fetchone()
            
            if not task:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Task not found'})
                }
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(dict(task), default=str)
            }
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
