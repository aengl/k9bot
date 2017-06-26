require('dotenv').config();

const debug = require('debug')('index');
const net = require('net');
const he = require('he');
const SlackBot = require('slackbots');
const storage = require('node-persist');
const qna = require('./qna');
const sheets = require('./sheets');

const botName = 'k9';
const bot = new SlackBot({
  token: process.env.BOT_TOKEN,
  name: botName,
});
let botUser = null;
let kbId = null;

const messageOptions = {
  as_user: true,
};

/**
 * Extracts a question & answer pair from a message.
 *
 * @param {string} messageText Message text.
 * @returns An array of form [question, answer].
 */
function getQnAPair(messageText) {
  const answerIndex = messageText.indexOf('A:');
  if (answerIndex > 0 && messageText.indexOf('Q:') === 0) {
    const question = messageText.substring(2, answerIndex).trim();
    const answer = messageText.substring(answerIndex + 2).trim();
    return [question, answer];
  }
}

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
  await qna.publish(kbId);
}

/**
 * Given a message on Slack, executes the appropriate response.
 *
 * @param {string} messageText Message that was sent to the bot, without
 *  the mentions (@botname).
 * @param {string} channel The channel to respond to.
 */
async function processMessage(messageText, channel) {
  const qnaPair = getQnAPair(messageText);
  if (qnaPair) {
    await qna.addAnswer(kbId, qnaPair[0], qnaPair[1], channel);
    bot.postMessage(channel, 'Got it! :dog:', messageOptions);
  } else if (messageText === 'update') {
    debug('updating');
    bot.postMessage(
      channel,
      'Brb, reading up on the latest questions! :books:',
      messageOptions
    );
    await createKnowledgeBaseFromSheets();
    bot.postMessage(channel, 'Back! :dog:', messageOptions);
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
  bot.postMessage(
    channel,
    data.score > 0 ? he.decode(data.answer) : 'Woof? :dog:',
    messageOptions
  );
}

const isChatMessage = message =>
  message.type === 'message' && Boolean(message.text);
const isBotMessage = message => message.subtype === 'bot_message';
const isDirectMessage = message =>
  message.channel && message.channel[0] === 'D';
const isFromMe = message => message.user === botUser.id;
const mentionsMe = message =>
  message.text && message.text.indexOf(`<@${botUser.id}>`) >= 0;
const getTextWithoutMention = message =>
  message.text && message.text.replace(/<.+>/gi, '').trim();

/**
 * Initialisation.
 */
bot.on('start', async () => {
  botUser = bot.users.find(user => user.name === botName);
  debug('found myself on Slack:', botUser.id);
  await storage.init();
  kbId = storage.getItemSync('kbId');
  await createKnowledgeBaseFromSheets();
  console.log(`Bot "${botName}" is listening for messages..`);
});

/**
 * Message handler.
 */
bot.on('message', message => {
  if (!kbId) {
    return;
  }
  if (isChatMessage(message) && !isBotMessage(message) && !isFromMe(message)) {
    if (isDirectMessage(message)) {
      debug('I got a direct message:', message);
      processMessage(message.text, message.channel);
    } else if (mentionsMe(message)) {
      debug('I was mentioned in this message:', message);
      processMessage(getTextWithoutMention(message), message.channel);
    }
  }
});

/**
 * Error handler.
 */
const reconnect = (...args) => {
  debug('lost connection', ...args);
  setTimeout(() => bot.connect(), 1000);
};
bot.on('close', reconnect);
bot.on('error', reconnect);
