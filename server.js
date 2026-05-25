const express = require('express')
const path = require('path')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const xss = require('xss-clean')
const { authRequired } = require('./middleware/auth')

const { initDb } = require('./db')

const authRoutes = require('./routes/auth')
const courseRoutes = require('./routes/course')

const app = express()
const PORT = process.env.PORT || 3000
const production = process.env.NODE_ENV === 'production'
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Use a strong secret in production.')
}

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.set('trust proxy', 1)

app.use(helmet())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(xss())
app.use(express.static(path.join(__dirname, 'public')))

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 6, message: 'Too many auth requests, please try again later.' })
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, message: 'Too many requests, please wait 15 minutes.' })
app.use(globalLimiter)
app.use('/auth', authLimiter, authRoutes)
app.use('/courses', courseRoutes)

app.get('/', (req, res) => res.render('index'))
app.get('/dashboard', authRequired, (req, res) => res.render('dashboard', { user: req.user }))

app.listen(PORT, async () => {
  await initDb()
  console.log(`Server running on http://localhost:${PORT}`)
})
