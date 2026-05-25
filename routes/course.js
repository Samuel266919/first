const express = require('express')
const { body, validationResult, param } = require('express-validator')
const { getDb } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')

const router = express.Router()

function handleValidation(req, res, view, data) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).render(view, { errors: errors.array(), ...data })
  }
}

router.get('/', async (req, res) => {
  const db = getDb()
  const courses = await db.all('SELECT c.*, u.name as author FROM courses c LEFT JOIN users u ON u.id = c.author_id')
  res.render('courses', { courses, user: req.user || null })
})

// Create course
router.get('/create', authRequired, requireRole('lecturer'), (req, res) => {
  res.render('create_course', { user: req.user })
})

router.post('/create', authRequired, requireRole('lecturer'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title is too long'),
  body('description').trim().isLength({ max: 2000 }).withMessage('Description is too long').escape(),
  async (req, res) => {
    const validation = handleValidation(req, res, 'create_course', { user: req.user, values: req.body })
    if (validation) return validation
    const { title, description } = req.body
    const db = getDb()
    await db.run('INSERT INTO courses (title, description, author_id) VALUES (?, ?, ?)', [title, description, req.user.id])
    res.redirect('/courses')
  }
)

// Edit course
router.get('/:id/edit', authRequired, requireRole('lecturer'), async (req, res) => {
  const db = getDb()
  const course = await db.get('SELECT * FROM courses WHERE id = ?', req.params.id)
  if (!course) return res.status(404).send('Not found')
  if (course.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
  res.render('edit_course', { course, user: req.user })
})

router.post('/:id/edit', authRequired, requireRole('lecturer'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title is too long'),
  body('description').trim().isLength({ max: 2000 }).withMessage('Description is too long').escape(),
  async (req, res) => {
    const validation = handleValidation(req, res, 'edit_course', { course: { id: req.params.id, ...req.body }, user: req.user })
    if (validation) return validation
    const { title, description } = req.body
    const db = getDb()
    const course = await db.get('SELECT * FROM courses WHERE id = ?', req.params.id)
    if (!course) return res.status(404).send('Not found')
    if (course.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
    await db.run('UPDATE courses SET title = ?, description = ? WHERE id = ?', [title, description, req.params.id])
    res.redirect(`/courses/${req.params.id}`)
  }
)

// Delete course
router.post('/:id/delete', authRequired, requireRole('lecturer'), async (req, res) => {
  const db = getDb()
  const course = await db.get('SELECT * FROM courses WHERE id = ?', req.params.id)
  if (!course) return res.status(404).send('Not found')
  if (course.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
  await db.run('DELETE FROM lessons WHERE course_id = ?', req.params.id)
  await db.run('DELETE FROM courses WHERE id = ?', req.params.id)
  res.redirect('/courses')
})

// Course detail
router.get('/:id', async (req, res) => {
  const db = getDb()
  const course = await db.get('SELECT c.*, u.name as author FROM courses c LEFT JOIN users u ON u.id = c.author_id WHERE c.id = ?', req.params.id)
  if (!course) return res.status(404).send('Not found')
  const lessons = await db.all('SELECT * FROM lessons WHERE course_id = ? ORDER BY id', req.params.id)
  res.render('course', { course, lessons, user: req.user || null })
})

// Create lesson
router.get('/:id/lessons/create', authRequired, requireRole('lecturer'), async (req, res) => {
  const db = getDb()
  const course = await db.get('SELECT * FROM courses WHERE id = ?', req.params.id)
  if (!course) return res.status(404).send('Course not found')
  if (course.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
  res.render('create_lesson', { course, user: req.user })
})

router.post('/:id/lessons/create', authRequired, requireRole('lecturer'),
  body('title').trim().notEmpty().withMessage('Lesson title is required').isLength({ max: 200 }).withMessage('Lesson title is too long'),
  body('content').trim().notEmpty().withMessage('Lesson content is required').isLength({ max: 5000 }).withMessage('Lesson content is too long'),
  async (req, res) => {
    const validation = handleValidation(req, res, 'create_lesson', { course: { id: req.params.id }, user: req.user, values: req.body })
    if (validation) return validation
    const { title, content } = req.body
    const db = getDb()
    const course = await db.get('SELECT * FROM courses WHERE id = ?', req.params.id)
    if (!course) return res.status(404).send('Course not found')
    if (course.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
    await db.run('INSERT INTO lessons (course_id, title, content) VALUES (?, ?, ?)', [req.params.id, title, content])
    res.redirect(`/courses/${req.params.id}`)
  }
)

// Lesson detail
router.get('/:id/lessons/:lid', async (req, res) => {
  const db = getDb()
  const lesson = await db.get('SELECT l.*, c.title as courseTitle, c.author_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?', req.params.lid)
  if (!lesson) return res.status(404).send('Lesson not found')
  res.render('lesson', { lesson, user: req.user || null })
})

// Edit lesson
router.get('/:id/lessons/:lid/edit', authRequired, requireRole('lecturer'), async (req, res) => {
  const db = getDb()
  const lesson = await db.get('SELECT l.*, c.author_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?', req.params.lid)
  if (!lesson) return res.status(404).send('Not found')
  if (lesson.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
  res.render('edit_lesson', { lesson, user: req.user })
})

router.post('/:id/lessons/:lid/edit', authRequired, requireRole('lecturer'),
  body('title').trim().notEmpty().withMessage('Lesson title is required').isLength({ max: 200 }).withMessage('Lesson title is too long'),
  body('content').trim().notEmpty().withMessage('Lesson content is required').isLength({ max: 5000 }).withMessage('Lesson content is too long'),
  async (req, res) => {
    const validation = handleValidation(req, res, 'edit_lesson', { lesson: { course_id: req.params.id, id: req.params.lid, ...req.body }, user: req.user })
    if (validation) return validation
    const { title, content } = req.body
    const db = getDb()
    const lesson = await db.get('SELECT l.*, c.author_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?', req.params.lid)
    if (!lesson) return res.status(404).send('Not found')
    if (lesson.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
    await db.run('UPDATE lessons SET title = ?, content = ? WHERE id = ?', [title, content, req.params.lid])
    res.redirect(`/courses/${req.params.id}/lessons/${req.params.lid}`)
  }
)

// Delete lesson
router.post('/:id/lessons/:lid/delete', authRequired, requireRole('lecturer'), async (req, res) => {
  const db = getDb()
  const lesson = await db.get('SELECT l.*, c.author_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?', req.params.lid)
  if (!lesson) return res.status(404).send('Not found')
  if (lesson.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).send('Forbidden')
  await db.run('DELETE FROM lessons WHERE id = ?', req.params.lid)
  res.redirect(`/courses/${req.params.id}`)
})

module.exports = router
