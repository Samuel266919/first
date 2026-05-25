const jwt = require('jsonwebtoken')
const { getDb } = require('../db')

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret'
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

async function authRequired(req, res, next) {
  const token = req.cookies['token']
  if (!token) return res.redirect('/auth/login')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const db = getDb()
    const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', payload.id)
    if (!user) return res.clearCookie('token', cookieOptions).redirect('/auth/login')
    req.user = user
    next()
  } catch (err) {
    return res.clearCookie('token', cookieOptions).redirect('/auth/login')
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).send('Unauthorized')
    if (req.user.role !== role && req.user.role !== 'admin') return res.status(403).send('Forbidden')
    next()
  }
}

module.exports = { authRequired, requireRole, JWT_SECRET }
