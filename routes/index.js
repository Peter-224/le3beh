// routes/index.js
const express = require('express');
const router = express.Router();
const { Question, Answer } = require('../models/CardModel');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'le3beh2024';

// ── Game ──
router.get('/', (req, res) => res.render('index', { title: 'Le3beh 3a Krouteh' }));

// ── Admin: login ──
router.get('/admin', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin/dashboard');
  res.render('admin-login', { title: 'Admin Login', error: null });
});

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { title: 'Admin Login', error: 'Wrong password!' });
});

router.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin');
});

// ── Admin middleware ──
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.redirect('/admin');
}

// ── Admin: dashboard ──
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  const answers = await Answer.find().sort({ createdAt: -1 });
  res.render('admin-dashboard', { title: 'Admin Dashboard', questions, answers, message: null });
});

// ── Questions CRUD ──
router.post('/admin/questions/add', requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (text && text.trim()) await Question.create({ text: text.trim() });
  res.redirect('/admin/dashboard');
});

router.post('/admin/questions/delete/:id', requireAdmin, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});

router.post('/admin/questions/toggle/:id', requireAdmin, async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (q) { q.active = !q.active; await q.save(); }
  res.redirect('/admin/dashboard');
});

router.post('/admin/questions/edit/:id', requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (text && text.trim()) await Question.findByIdAndUpdate(req.params.id, { text: text.trim() });
  res.redirect('/admin/dashboard');
});

// ── Answers CRUD ──
router.post('/admin/answers/add', requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (text && text.trim()) await Answer.create({ text: text.trim() });
  res.redirect('/admin/dashboard');
});

router.post('/admin/answers/delete/:id', requireAdmin, async (req, res) => {
  await Answer.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});

router.post('/admin/answers/toggle/:id', requireAdmin, async (req, res) => {
  const a = await Answer.findById(req.params.id);
  if (a) { a.active = !a.active; await a.save(); }
  res.redirect('/admin/dashboard');
});

router.post('/admin/answers/edit/:id', requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (text && text.trim()) await Answer.findByIdAndUpdate(req.params.id, { text: text.trim() });
  res.redirect('/admin/dashboard');
});

module.exports = router;
