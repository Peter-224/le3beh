// models/CardModel.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const answerSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Question = mongoose.model('Question', questionSchema);
const Answer = mongoose.model('Answer', answerSchema);

// Default questions to seed on first run
const DEFAULT_QUESTIONS = [
  "2alouleh ___ bass ma sadda2et.",
  "Chou bte3mel la7zartak lamma tkoun brou7ak bel bayt?",
  "Shou el jaweb el ideal la hal sou2al: Leish el 7ayeh?",
  "El shay el wa7id yalli biftaker fio abel ma ynam howeh ___.",
  "Chou bta2oulo la wa7ad yalli byed3ak 3al 3azimeh w enta ma baddak trouh?",
  "El doktor 2alak en3am 3a 7alak, ma 3andak gheir ___.",
  "Chou byehsal lamma tbaddel el channel w te2sa bel mandra3?",
  "Shou el a7san hediyyeh la 3id melad?",
  "Leish ma rde7et 3ala el interview? Kenet ___ kter.",
  "Law ken fi wifi bel janna, shou kan esmo?",
  "Chou byehsal lamma el kahraba tinfa2e bel bayt?",
  "El lebneneh ma byi3ich min ___.",
  "Chou byehsal lamma t2oulo 'bas chi shwayy' bel 7afeleh?",
  "Shou bteshtri 2eza 3andak 100 dolar extra?",
  "Chou bya3mel el lebneneh 2abel ma ynem?",
];

const DEFAULT_ANSWERS = [
  "Pizza bel forn", "Netflix w chill", "Arak w mayeh", "Manakish 3a sabi3",
  "Ha2ibeh Louis Vuitton", "Selfie bel hammem", "Ta7wil men el kharij",
  "Mishwer 3a Jounieh", "Kabb 3a el sofa", "Tele2on men el 7abayeb",
  "Diet Cola", "Taouk w kafta", "Manousheh bel zatar", "7aki filos",
  "Yijiblak Allah", "Bon Vivant", "Masari 3al bourak", "Tik tok 3 sa3at",
  "Lahmeh bel karaz", "Hawa nde2", "3azimeh w ma jeh", "Film porno",
  "Bala manyakeh", "We7yetak je te jure", "Ma 3am befham el sou2al",
  "Horouf namla", "Byez3al w byerja3", "3am ye3mol drama",
  "Hajez bel resto w ma roh", "Sahran 3al whatsapp",
  "Nayem 3al sofa", "Baddou ye7ki bass ma bya3ref keif",
  "Shu2ul bayyi", "Dawleh jdideh", "Warak dawali", "Na2l bel 7aret",
  "Yalla Fadi 2arafte na", "Eddeh tbousak", "Kefir w tabouleh",
  "Byit3asab 3a chi ma byes3ad",
];

async function seedIfEmpty() {
  const qCount = await Question.countDocuments();
  const aCount = await Answer.countDocuments();
  if (qCount === 0) {
    await Question.insertMany(DEFAULT_QUESTIONS.map(text => ({ text })));
    console.log(`Seeded ${DEFAULT_QUESTIONS.length} questions`);
  }
  if (aCount === 0) {
    await Answer.insertMany(DEFAULT_ANSWERS.map(text => ({ text })));
    console.log(`Seeded ${DEFAULT_ANSWERS.length} answers`);
  }
}

module.exports = { Question, Answer, seedIfEmpty };
