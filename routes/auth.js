const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { getDb } = require('../db')
const { JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
}

router.get('/register', (req, res) => res.render('register', { errors: [], values: {}, user: null }))
router.get('/login', (req, res) => res.render('login', { errors: [], values: {}, user: null }))

router.post('/register',
  body('name').trim().escape().optional({ checkFalsy: true }),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'lecturer']).withMessage('Invalid role'),
  async (req, res) => {
    const errors = validationResult(req)
    const values = { name: req.body.name || '', email: req.body.email || '', role: req.body.role || 'student' }
    if (!errors.isEmpty()) {
      return res.status(400).render('register', { errors: errors.array(), values, user: null })
    }
    const { name, email, password, role } = req.body
    const db = getDb()
    const hashed = await bcrypt.hash(password, 10)
    try {
      const result = await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name || '', email, hashed, role || 'student'])
      const userId = result.lastID
      const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '8h' })
      res.cookie('token', token, cookieOptions)
      res.redirect('/dashboard')
    } catch (err) {
      return res.status(400).render('register', { errors: [{ msg: 'User already exists or registration error' }], values, user: null })
    }
  }
)

router.post('/login',
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req)
    const values = { email: req.body.email || '' }
    if (!errors.isEmpty()) {
      return res.status(400).render('login', { errors: errors.array(), values, user: null })
    }
    const { email, password } = req.body
    const db = getDb()
    const user = await db.get('SELECT * FROM users WHERE email = ?', email)
    if (!user) return res.status(400).render('login', { errors: [{ msg: 'Invalid email or password' }], values, user: null })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(400).render('login', { errors: [{ msg: 'Invalid email or password' }], values, user: null })
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '8h' })
    res.cookie('token', token, cookieOptions)
    res.redirect('/dashboard')
  }
)

router.get('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions)
  res.redirect('/')
})

module.exports = router
