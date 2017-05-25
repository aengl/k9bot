require('dotenv').config();

const debug = require('debug')('index');
const he = require('he');
const SlackBot = require('slackbots');
const qna = require('./qna');

const botName = 'k9';
const bot = new SlackBot({
  token: process.env.BOT_TOKEN,
  name: botName,
});
let botUser = undefined;

const messageOptions = {
  as_user: true,
};

/**
 * Given a message on Slack, executes the appropriate response.
 *
 * @param {string} messageText Message that was sent to the bot, without
 *  the mentions (@botname).
 * @param {string} channel The channel to respond to.
 */
function processMessage(messageText, channel) {
  const answerIndex = messageText.indexOf('A:');
  if (answerIndex > 0 && messageText.indexOf('Q:') === 0) {
    const question = messageText.substring(2, answerIndex).trim();
    const answer = messageText.substring(answerIndex + 2).trim();
    qna
      .addAnswer(question, answer, channel)
      .then(() => bot.postMessage(channel, 'Got it! :dog:', messageOptions));
  } else {
    qna.getAnswer(messageText).then(data => postAnswer(data, channel));
  }
}

/**
 * Posts an answer to a channel.
 *
 * @param {Object} data Data returned by `qna.getAnswer()`.
 * @param {string} channel A Slack channel ID.
 */
function postAnswer(data, channel) {
  debug('posting answer:', data);
  bot.postMessage(
    channel,
    data.score > 0 ? he.decode(data.answer) : 'Woof? :dog:',
    messageOptions
  );
}

const isChatMessage = message =>
  message.type === 'message' && Boolean(message.text);
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
bot.on('start', () => {
  botUser = bot.users.find(user => user.name === botName);
  debug('found myself on Slack:', botUser.id);
});

/**
 * Message handler.
 */
bot.on('message', message => {
  if (isChatMessage(message) && !isFromMe(message)) {
    if (isDirectMessage(message)) {
      debug('I got a direct message:', message);
      processMessage(message.text, message.channel);
    } else if (mentionsMe(message)) {
      debug('I was mentioned in this message:', message);
      processMessage(getTextWithoutMention(message), message.channel);
    }
  }
});
