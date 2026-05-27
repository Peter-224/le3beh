// models/CardModel.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  answerCount: { type: Number, default: 1, enum: [1, 2] },
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

const DEFAULT_QUESTIONS = [
  { text: "2alouleh ___ bass ma sadda2et.", answerCount: 1 },
  { text: "Chou bte3mel la7zartak lamma tkoun brou7ak bel bayt?", answerCount: 1 },
  { text: "Shou el jaweb el ideal la hal sou2al: Leish el 7ayeh?", answerCount: 1 },
  { text: "El shay el wa7id yalli biftaker fio abel ma ynam howeh ___.", answerCount: 1 },
  { text: "Chou bta2oulo la wa7ad yalli byed3ak 3al 3azimeh w enta ma baddak trouh?", answerCount: 1 },
  { text: "El doktor 2alak en3am 3a 7alak, ma 3andak gheir ___.", answerCount: 1 },
  { text: "Chou byehsal lamma tbaddel el channel w te2sa bel mandra3?", answerCount: 1 },
  { text: "Shou el a7san hediyyeh la 3id melad?", answerCount: 1 },
  { text: "Leish ma rde7et 3ala el interview? Kenet ___ kter.", answerCount: 1 },
  { text: "Law ken fi wifi bel janna, shou kan esmo?", answerCount: 1 },
  { text: "Chou byehsal lamma el kahraba tinfa2e bel bayt?", answerCount: 1 },
  { text: "El lebneneh ma byi3ich min ___.", answerCount: 1 },
  { text: "2alouleh ___ w ___ bass ma sadda2et.", answerCount: 2 },
  { text: "El mandra3 el kamil byehtaj ___ w ___.", answerCount: 2 },
  { text: "Shou bteshtri 2eza 3andak 100 dolar extra?", answerCount: 1 },
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
  "Byit3asab 3a chi ma byes3ad", "3an jadd bala manyakeh",
  "Bon appetit ya 3ammi", "Kebbeh w arak", "Neskafe w cigarette",
  "Whatsapp voice note", "Stories 3al instagram", "Tele2on men el em",
];

async function seedIfEmpty() {
  const qCount = await Question.countDocuments();
  const aCount = await Answer.countDocuments();
  if (qCount === 0) {
    await Question.insertMany(DEFAULT_QUESTIONS);
    console.log(`Seeded ${DEFAULT_QUESTIONS.length} questions`);
  }
  if (aCount === 0) {
    await Answer.insertMany(DEFAULT_ANSWERS.map(text => ({ text })));
    console.log(`Seeded ${DEFAULT_ANSWERS.length} answers`);
  }
}

module.exports = { Question, Answer, seedIfEmpty };
