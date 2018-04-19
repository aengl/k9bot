require('dotenv').config();

const debug = require('debug')('index');
const he = require('he');
const qna = require('./qna');
const sheets = require('./sheets');
const Slackbot = require('./slackbot');
const storage = require('node-persist');

process.on('unhandledRejection', up => {
  throw up;
});

const bot = new Slackbot();

/**
 * Creates a new knowledge base from Google Sheets.
 * @returns {string} The new knowledge base id.
 */
async function createKnowledgeBaseFromSheets(oldKbId) {
  const sheet = await sheets.read();
  const qnaPairs = sheet.data.values.map(row => ({
    question: row[0],
    answer: row[1],
  }));
  if (oldKbId) {
    await qna.deleteKnowledgeBase(oldKbId);
    storage.removeItemSync('kbId');
  }
  const kbId = await qna.createKnowledgeBase('k9bot', qnaPairs);
  await storage.setItem('kbId', kbId);
  return kbId;
}

/**
 * Posts an answer to a channel.
 * @param {Object} data Data returned by `qna.getAnswer()`.
 * @param {string} channel A Slack channel ID.
 */
function postAnswer(data, channel) {
  bot.say(channel, data.score > 0 ? he.decode(data.answer) : 'Woof? :dog:');
}

/**
 * Given a message on Slack, executes the appropriate response.
 * @param {string} messageText Message that was sent to the bot, without
 *  the mentions (@botname).
 * @param {string} channel The channel to respond to.
 * @returns {string} The knowledge base id.
 */
async function processMessage(kbId, messageText, channel) {
  if (!kbId) {
    // Ignore all message if we don't have a knowledge base yet.
    return kbId;
  }
  if (messageText === 'update') {
    debug('updating');
    bot.say(channel, 'Brb, reading up on the latest questions! :books:');
    const newKbId = await createKnowledgeBaseFromSheets();
    bot.say(channel, 'Back! :dog:');
    return newKbId;
  }
  const data = await qna.getAnswer(kbId, messageText);
  postAnswer(data, channel);
  return kbId;
}

/**
 * Initialisation.
 *
 * Connect the Slackbot and create the knowledge base if necessary.
 */
async function init() {
  await bot.connect();
  await storage.init();
  let kbId = await storage.getItem('kbId');
  if (!kbId) {
    kbId = await createKnowledgeBaseFromSheets(kbId);
  } else {
    debug('restored knowledge base', kbId);
  }
  bot.on('chatMessage', (...args) => {
    kbId = processMessage(kbId, ...args);
  });
}

init();
