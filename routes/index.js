// routes/index.js
const express = require('express');
const router = express.Router();
const { Question, Answer } = require('../models/CardModel');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'le3beh2024';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', (req, res) => res.render('index', { title: 'Le3beh 3a Krouteh' }));

router.get('/admin', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin/dashboard');
  res.render('admin-login', { title: 'Admin Login', error: null });
});

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) { req.session.isAdmin = true; return res.redirect('/admin/dashboard'); }
  res.render('admin-login', { title: 'Admin Login', error: 'Wrong password!' });
});

router.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/admin'); });

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.redirect('/admin');
}

async function renderDashboard(res, message = null, messageType = 'success') {
  const questions = await Question.find().sort({ createdAt: -1 });
  const answers = await Answer.find().sort({ createdAt: -1 });
  res.render('admin-dashboard', { title: 'Admin Dashboard', questions, answers, message, messageType });
}

router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  await renderDashboard(res);
});

// ── Bulk import questions ──
router.post('/admin/questions/bulk', requireAdmin, async (req, res) => {
  const raw = req.body.bulkText || '';
  const answerCount = parseInt(req.body.answerCount) === 2 ? 2 : 1;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return renderDashboard(res, 'No questions found! Make sure each question is on a new line.', 'error');

  let added = 0, skipped = 0;
  for (const text of lines) {
    const existing = await Question.findOne({ text: { $regex: new RegExp(`^${escapeRegex(text)}$`, 'i') } });
    if (existing) { skipped++; continue; }
    await Question.create({ text, answerCount });
    added++;
  }
  await renderDashboard(res, `Bulk import done! Added: ${added} questions, Skipped (duplicates): ${skipped}`, added > 0 ? 'success' : 'error');
});

// ── Bulk import answers ──
router.post('/admin/answers/bulk', requireAdmin, async (req, res) => {
  const raw = req.body.bulkText || '';
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return renderDashboard(res, 'No answers found! Make sure each answer is on a new line.', 'error');

  let added = 0, skipped = 0;
  for (const text of lines) {
    const existing = await Answer.findOne({ text: { $regex: new RegExp(`^${escapeRegex(text)}$`, 'i') } });
    if (existing) { skipped++; continue; }
    await Answer.create({ text });
    added++;
  }
  await renderDashboard(res, `Bulk import done! Added: ${added} answers, Skipped (duplicates): ${skipped}`, added > 0 ? 'success' : 'error');
});

// ── Single question ──
router.post('/admin/questions/add', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  const answerCount = parseInt(req.body.answerCount) === 2 ? 2 : 1;
  if (!text) return renderDashboard(res, 'Question cannot be empty!', 'error');
  const existing = await Question.findOne({ text: { $regex: new RegExp(`^${escapeRegex(text)}$`, 'i') } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Question.create({ text, answerCount });
  await renderDashboard(res, `Question added: "${text}"`, 'success');
});

router.post('/admin/questions/delete/:id', requireAdmin, async (req, res) => {
  const q = await Question.findByIdAndDelete(req.params.id);
  await renderDashboard(res, q ? `Deleted: "${q.text}"` : 'Not found!', q ? 'success' : 'error');
});

router.post('/admin/questions/toggle/:id', requireAdmin, async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (q) { q.active = !q.active; await q.save(); }
  await renderDashboard(res, q ? `"${q.text}" ${q.active ? 'enabled' : 'disabled'}` : 'Not found!', 'success');
});

router.post('/admin/questions/edit/:id', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  const answerCount = parseInt(req.body.answerCount) === 2 ? 2 : 1;
  if (!text) return renderDashboard(res, 'Question cannot be empty!', 'error');
  const existing = await Question.findOne({ text: { $regex: new RegExp(`^${escapeRegex(text)}$`, 'i') }, _id: { $ne: req.params.id } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Question.findByIdAndUpdate(req.params.id, { text, answerCount });
  await renderDashboard(res, `Updated: "${text}"`, 'success');
});

// ── Single answer ──
router.post('/admin/answers/add', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return renderDashboard(res, 'Answer cannot be empty!', 'error');
  const existing = await Answer.findOne({ text: { $regex: new RegExp(`^${escapeRegex(text)}$`, 'i') } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Answer.create({ text });
  await renderDashboard(res, `Answer added: "${text}"`, 'success');
});

router.post('/admin/answers/delete/:id', requireAdmin, async (req, res) => {
  const a = await Answer.findByIdAndDelete(req.params.id);
  await renderDashboard(res, a ? `Deleted: "${a.text}"` : 'Not found!', a ? 'success' : 'error');
});

router.post('/admin/answers/toggle/:id', requireAdmin, async (req, res) => {
  const a = await Answer.findById(req.params.id);
  if (a) { a.active = !a.active; await a.save(); }
  await renderDashboard(res, a ? `"${a.text}" ${a.active ? 'enabled' : 'disabled'}` : 'Not found!', 'success');
});

router.post('/admin/answers/edit/:id', requireAdmin, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return renderDashboard(res, 'Answer cannot be empty!', 'error');
  const existing = await Answer.findOne({ text: { $regex: new RegExp(`^${escapeRegex(text)}$`, 'i') }, _id: { $ne: req.params.id } });
  if (existing) return renderDashboard(res, `Duplicate! "${text}" already exists.`, 'error');
  await Answer.findByIdAndUpdate(req.params.id, { text });
  await renderDashboard(res, `Updated: "${text}"`, 'success');
});

module.exports = router;
