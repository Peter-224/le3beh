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

// ── Helper: render dashboard with message ──
async function renderDashboard(res, message = null, messageType = 'success') {
  const questions = await Question.find().sort({ createdAt: -1 });
  const answers = await Answer.find().sort({ createdAt: -1 });
  res.render('admin-dashboard', { title: 'Admin Dashboard', questions, answers, message, messageType });
}

// ── Admin: dashboard ──
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  await renderDashboard(res);
});

// ── Questions CRUD ──
router.post('/admin/questions/add', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return renderDashboard(res, 'Question text cannot be empty!', 'error');
  // Check duplicate (case-insensitive)
  const existing = await Question.findOne({ text: { $regex: new RegExp(`^${text}$`, 'i') } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Question.create({ text });
  await renderDashboard(res, `Question added: "${text}"`, 'success');
});

router.post('/admin/questions/delete/:id', requireAdmin, async (req, res) => {
  const q = await Question.findByIdAndDelete(req.params.id);
  await renderDashboard(res, q ? `Deleted: "${q.text}"` : 'Question not found!', q ? 'success' : 'error');
});

router.post('/admin/questions/toggle/:id', requireAdmin, async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (q) { q.active = !q.active; await q.save(); }
  await renderDashboard(res, q ? `"${q.text}" is now ${q.active ? 'enabled' : 'disabled'}` : 'Not found!', 'success');
});

router.post('/admin/questions/edit/:id', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return renderDashboard(res, 'Question text cannot be empty!', 'error');
  // Check duplicate excluding current
  const existing = await Question.findOne({ text: { $regex: new RegExp(`^${text}$`, 'i') }, _id: { $ne: req.params.id } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Question.findByIdAndUpdate(req.params.id, { text });
  await renderDashboard(res, `Question updated to: "${text}"`, 'success');
});

// ── Answers CRUD ──
router.post('/admin/answers/add', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return renderDashboard(res, 'Answer text cannot be empty!', 'error');
  // Check duplicate (case-insensitive)
  const existing = await Answer.findOne({ text: { $regex: new RegExp(`^${text}$`, 'i') } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Answer.create({ text });
  await renderDashboard(res, `Answer added: "${text}"`, 'success');
});

router.post('/admin/answers/delete/:id', requireAdmin, async (req, res) => {
  const a = await Answer.findByIdAndDelete(req.params.id);
  await renderDashboard(res, a ? `Deleted: "${a.text}"` : 'Answer not found!', a ? 'success' : 'error');
});

router.post('/admin/answers/toggle/:id', requireAdmin, async (req, res) => {
  const a = await Answer.findById(req.params.id);
  if (a) { a.active = !a.active; await a.save(); }
  await renderDashboard(res, a ? `"${a.text}" is now ${a.active ? 'enabled' : 'disabled'}` : 'Not found!', 'success');
});

router.post('/admin/answers/edit/:id', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return renderDashboard(res, 'Answer text cannot be empty!', 'error');
  // Check duplicate excluding current
  const existing = await Answer.findOne({ text: { $regex: new RegExp(`^${text}$`, 'i') }, _id: { $ne: req.params.id } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Answer.findByIdAndUpdate(req.params.id, { text });
  await renderDashboard(res, `Answer updated to: "${text}"`, 'success');
});

module.exports = router;
