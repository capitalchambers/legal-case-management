// Authentication utilities for the legal case management system
import { Context } from 'hono'
import type { CloudflareBindings } from './types'

// Simple password hashing (for Cloudflare Workers environment)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'legal_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const inputHash = await hashPassword(password)
  return inputHash === hashedPassword
}

// Generate secure session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Session management
export async function createSession(c: Context<{ Bindings: CloudflareBindings }>, userId: number, userAgent?: string, ipAddress?: string) {
  const { DB } = c.env
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  await DB.prepare(`
    INSERT INTO user_sessions (session_token, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).bind(token, userId, expiresAt.toISOString(), ipAddress || '', userAgent || '').run()
  
  return token
}

export async function validateSession(c: Context<{ Bindings: CloudflareBindings }>, token: string) {
  const { DB } = c.env
  
  const session = await DB.prepare(`
    SELECT us.*, u.id as user_id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = ? AND us.expires_at > datetime('now') AND u.is_active = TRUE
  `).bind(token).first()
  
  if (session) {
    // Update last accessed
    await DB.prepare(`
      UPDATE user_sessions SET last_accessed = datetime('now') WHERE session_token = ?
    `).bind(token).run()
    
    return session
  }
  
  return null
}

export async function deleteSession(c: Context<{ Bindings: CloudflareBindings }>, token: string) {
  const { DB } = c.env
  await DB.prepare(`DELETE FROM user_sessions WHERE session_token = ?`).bind(token).run()
}

// Clean expired sessions
export async function cleanExpiredSessions(c: Context<{ Bindings: CloudflareBindings }>) {
  const { DB } = c.env
  await DB.prepare(`DELETE FROM user_sessions WHERE expires_at <= datetime('now')`).run()
}

// Check user permissions
export async function hasPermission(c: Context<{ Bindings: CloudflareBindings }>, userId: number, permission: string): Promise<boolean> {
  const { DB } = c.env
  
  const result = await DB.prepare(`
    SELECT 1 FROM user_permissions up
    JOIN users u ON up.user_id = u.id
    WHERE up.user_id = ? AND (up.permission_name = ? OR up.permission_name = 'admin' OR u.role = 'admin') AND up.granted = TRUE
  `).bind(userId, permission).first()
  
  return !!result
}

// Log user activity
export async function logActivity(
  c: Context<{ Bindings: CloudflareBindings }>, 
  userId: number | null, 
  action: string, 
  resourceType: string, 
  resourceId?: number, 
  details?: string
) {
  const { DB } = c.env
  
  const request = c.req
  const ipAddress = request.header('CF-Connecting-IP') || request.header('X-Forwarded-For') || ''
  const userAgent = request.header('User-Agent') || ''
  
  await DB.prepare(`
    INSERT INTO activity_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, action, resourceType, resourceId || null, details || '', ipAddress, userAgent).run()
}

// Authentication middleware
export function requireAuth(permissions?: string[]) {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next: any) => {
    const authHeader = c.req.header('Authorization')
    const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token') || ''
    
    if (!sessionToken) {
      return c.json({ success: false, error: 'Authentication required' }, 401)
    }
    
    const session = await validateSession(c, sessionToken)
    if (!session) {
      return c.json({ success: false, error: 'Invalid or expired session' }, 401)
    }
    
    // Check permissions if required
    if (permissions && permissions.length > 0) {
      for (const permission of permissions) {
        const hasPermissionResult = await hasPermission(c, session.user_id, permission)
        if (!hasPermissionResult) {
          await logActivity(c, session.user_id, 'access_denied', 'permission', null, `Required permission: ${permission}`)
          return c.json({ success: false, error: 'Insufficient permissions' }, 403)
        }
      }
    }
    
    // Add user info to context
    c.set('user', session)
    await next()
  }
}

// Get current user from context
export function getCurrentUser(c: Context) {
  return c.get('user')
}

// Default user credentials for testing
export const DEFAULT_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    firstName: 'System',
    lastName: 'Administrator'
  },
  {
    username: 'sarah.johnson',
    password: 'lawyer123',
    role: 'lawyer',
    firstName: 'Sarah',
    lastName: 'Johnson'
  },
  {
    username: 'michael.chen',
    password: 'lawyer123',
    role: 'lawyer',
    firstName: 'Michael',
    lastName: 'Chen'
  },
  {
    username: 'emily.rodriguez',
    password: 'lawyer123',
    role: 'lawyer',
    firstName: 'Emily',
    lastName: 'Rodriguez'
  },
  {
    username: 'david.kim',
    password: 'paralegal123',
    role: 'paralegal',
    firstName: 'David',
    lastName: 'Kim'
  }
]