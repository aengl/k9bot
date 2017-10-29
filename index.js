require('dotenv').config();

const debug = require('debug')('index');
const he = require('he');
const qna = require('./qna');
const sheets = require('./sheets');
const Slackbot = require('./slackbot');
const storage = require('node-persist');

let kbId = null;
const bot = new Slackbot(process.env.BOT_TOKEN);

/**
 * Creates a new knowledge base from Google Sheets.
 */
async function createKnowledgeBaseFromSheets() {
  const sheet = await sheets.read();
  const qnaPairs = sheet.values.map(row => {
    return {
      question: row[0],
      answer: row[1],
    };
  });
  if (kbId) {
    await qna.deleteKnowledgeBase(kbId);
    storage.removeItemSync('kbId');
  }
  kbId = await qna.createKnowledgeBase('k9bot', qnaPairs);
  storage.setItemSync('kbId', kbId);
}

/**
 * Given a message on Slack, executes the appropriate response.
 *
 * @param {string} messageText Message that was sent to the bot, without
 *  the mentions (@botname).
 * @param {string} channel The channel to respond to.
 */
async function processMessage(messageText, channel) {
  if (!kbId) {
    // Ignore all message if we don't have a knowledge base yet.
    return;
  }
  if (messageText === 'update') {
    debug('updating');
    bot.say(channel, 'Brb, reading up on the latest questions! :books:');
    await createKnowledgeBaseFromSheets();
    bot.say(channel, 'Back! :dog:');
  } else {
    const data = await qna.getAnswer(kbId, messageText);
    postAnswer(data, channel);
  }
}

/**
 * Posts an answer to a channel.
 *
 * @param {Object} data Data returned by `qna.getAnswer()`.
 * @param {string} channel A Slack channel ID.
 */
function postAnswer(data, channel) {
  bot.say(channel, data.score > 0 ? he.decode(data.answer) : 'Woof? :dog:');
}

/**
 * Initialisation.
 *
 * Connect the Slackbot and create the knowledge base if necessary.
 */
bot.connect().then(async () => {
  await storage.init();
  kbId = storage.getItemSync('kbId');
  if (!kbId) {
    await createKnowledgeBaseFromSheets();
  } else {
    debug('restored knowledge base', kbId);
  }
});

bot.on('chatMessage', processMessage);
