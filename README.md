# Le3beh 3a Krouteh 🎴

Lebanese party card game — real-time multiplayer, built with Node.js MVC + Socket.IO.

## Project Structure

```
le3beh/
├── server.js                  ← Entry point (Express + Socket.IO)
├── package.json
├── routes/
│   └── index.js               ← HTTP routes
├── controllers/
│   └── GameController.js      ← Socket.IO event handlers
├── models/
│   └── GameModel.js           ← Game state, Room class, card data
├── views/
│   └── index.ejs              ← Single-page EJS template
└── public/
    ├── css/style.css          ← All styles
    └── js/client.js           ← Client-side Socket.IO + UI logic
```

## How to Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

## How to Play

1. One player clicks **Create Room** and shares the 4-letter code
2. Others enter their name + code and click **Join Room**
3. Host clicks **Start Game** (min 2 players)
4. Each round:
   - One player is the **Judge** (rotates each round)
   - Everyone else picks an answer card from their hand of 10
   - Once all answers are in, the **Judge taps the funniest answer**
   - That player wins the blue card (+1 point)
5. **First to 5 points wins the game!**

## Game Rules (from le3beh.com)

- Each player gets 10 white answer cards
- The judge draws a blue question card and reads it aloud
- Everyone else submits their best answer (face-down / anonymous to judge)
- Judge picks the best/funniest answer
- Winner keeps the blue question card as a point
- Judge rotates each round
- First to collect 5 blue cards wins the round

## Tech Stack

- **Server**: Node.js + Express
- **Real-time**: Socket.IO (WebSockets)
- **Views**: EJS templating
- **State**: In-memory (no database needed for a party game)
- **Frontend**: Vanilla JS + CSS
