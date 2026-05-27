// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const routes = require('./routes/index');
const { registerHandlers } = require('./controllers/GameController');
const { Question, Answer, seedIfEmpty } = require('./models/CardModel');
const { setCards } = require('./models/GameModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'le3beh-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Routes
app.use('/', routes);

// Socket.IO
io.on('connection', socket => registerHandlers(io, socket));

// Connect to MongoDB then start server
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://peterbathich1993_db_user:w46Jo862nHpY0Ciq@cluster0.3bq4k5o.mongodb.net/le3beh?retryWrites=true&w=majority&appName=Cluster0';
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    await seedIfEmpty();

    // Load active cards into memory for the game
    const questions = await Question.find({ active: true }).select('text');
    const answers = await Answer.find({ active: true }).select('text');
    setCards(questions.map(q => q.text), answers.map(a => a.text));

    server.listen(PORT, () => {
      console.log(`\n🎴 Le3beh 3a Krouteh running at http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

// Reload cards from DB every 5 minutes so admin changes reflect in game
setInterval(async () => {
  try {
    const questions = await Question.find({ active: true }).select('text');
    const answers = await Answer.find({ active: true }).select('text');
    setCards(questions.map(q => q.text), answers.map(a => a.text));
  } catch(e) {}
}, 5 * 60 * 1000);

start();
