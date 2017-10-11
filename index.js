require('dotenv').config();

const debug = require('debug')('index');
const he = require('he');
const qna = require('./qna');
const sheets = require('./sheets');
const slack = require('slack');
const storage = require('node-persist');
const WebSocket = require('ws');

const token = process.env.BOT_TOKEN;

let botUserId = null;
let kbId = null;

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
 * Makes the bot send a message to a Slack channel.
 *
 * @param {string} channel Channel to post the message in.
 * @param {string} text The message text.
 * @returns {Promise} A promise of a response object.
 */
function say(channel, text) {
  return new Promise(resolve =>
    slack.chat.postMessage(
      {
        token,
        channel,
        text,
        as_user: true,
      },
      resolve
    )
  );
}

/**
 * Given a message on Slack, executes the appropriate response.
 *
 * @param {string} messageText Message that was sent to the bot, without
 *  the mentions (@botname).
 * @param {string} channel The channel to respond to.
 */
async function processMessage(messageText, channel) {
  if (messageText === 'update') {
    debug('updating');
    say(channel, 'Brb, reading up on the latest questions! :books:');
    await createKnowledgeBaseFromSheets();
    say(channel, 'Back! :dog:');
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
  say(channel, data.score > 0 ? he.decode(data.answer) : 'Woof? :dog:');
}

const isChatMessage = message =>
  message.type === 'message' && message.text && message.text.length;
const isBotMessage = message => message.subtype === 'bot_message';
const isDirectMessage = message =>
  message.channel && message.channel[0] === 'D';
const isFromMe = message => message.user === botUserId;
const mentionsMe = message =>
  message.text && message.text.indexOf(`<@${botUserId}>`) >= 0;
const getTextWithoutMention = message =>
  message.text && message.text.replace(/<.+>/gi, '').trim();

/**
 * Message handler.
 */
function onMessage(message) {
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
}

/**
 * Connects to Slack's RTM interface.
 * @param {string} url WebSocket address to connect to
 */
function connect(url) {
  debug('opening websocket connection to', url);
  const ws = new WebSocket(url, {});
  ws.on('open', () => debug('websocket connection established'));
  ws.on('message', s => onMessage(JSON.parse(s)));
  ws.on('close', () => debug('websocket connection lost'));
}

/**
 * Initialisation.
 */
slack.rtm.connect({ token }).then(async data => {
  botUserId = data.self.id;
  await storage.init();
  kbId = storage.getItemSync('kbId');
  if (!kbId) {
    await createKnowledgeBaseFromSheets();
  } else {
    debug('restored knowledge base', kbId);
  }
  connect(data.url);
});
