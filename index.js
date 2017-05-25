require('dotenv').config();

const debug = require('debug')('index');
const he = require('he');
const request = require('request-promise-native');
const SlackBot = require('slackbots');

const botName = 'k9';
const bot = new SlackBot({
  token: process.env.BOT_TOKEN,
  name: botName,
});
let botUser = undefined;

const messageOptions = {
  as_user: true,
};

const url = `https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/${process.env.KNOWLEDGEBASE_ID}/`;

const headers = {
  'Ocp-Apim-Subscription-Key': process.env.QNA_KEY,
};

/**
 * Queries the knowledge base for a question and returns the answer as an
 * object.
 *
 * @param {Object} question The question to query the KB with.
 */
function getAnswer(question) {
  debug('got question:', question);
  return new Promise((resolve, reject) => {
    request
      .post({
        url: url + 'generateAnswer',
        headers,
        form: { question },
      })
      .then(res => {
        const data = JSON.parse(res);
        debug('got answers:', data);
        resolve(data.answers[0]);
      })
      .catch(debug);
  });
}

/**
 * Posts an answer to a channel.
 *
 * @param {Object} data Data returned by `getAnswer()`.
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

/**
 * Adds a QnA pair to the knowledge base.
 *
 * @param {string} question The question to add.
 * @param {string} answer The answer to the question.
 * @param {string} channel The channel to post an acknowledgement to.
 */
function addAnswer(question, answer, channel) {
  debug('adding new question/answer:', question, answer);
  const body = JSON.stringify({
    add: {
      qnaPairs: [
        {
          answer: answer,
          question: question,
        },
      ],
    },
  });
  return new Promise((resolve, reject) => {
    request
      .patch({ url, headers, body })
      .then(() => {
        bot.postMessage(channel, 'Got it! :dog:', messageOptions);
        publish().then(resolve);
      })
      .catch(debug);
  });
}

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
    addAnswer(question, answer, channel);
  } else {
    getAnswer(messageText).then(data => postAnswer(data, channel));
  }
}

/**
 * Publishes the knowledge base. Necessary to make any changes live.
 */
function publish() {
  debug('publishing knowledge base');
  return request.put({ url, headers });
}

function isChatMessage(message) {
  return message.type === 'message' && Boolean(message.text);
}

function isDirectMessage(message) {
  return message.channel && message.channel[0] === 'D';
}

function isFromMe(message) {
  return message.user === botUser.id;
}

function mentionsMe(message) {
  return message.text && message.text.indexOf(`<@${botUser.id}>`) >= 0;
}

function getTextWithoutMention(message) {
  return message.text && message.text.replace(/<.+>/gi, '').trim();
}

bot.on('start', () => {
  botUser = bot.users.find(user => user.name === botName);
  debug('found myself on Slack:', botUser.id);
});

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
