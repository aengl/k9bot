require('dotenv').config();

const debug = require('debug')('index');
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

const qnaUrl = `https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/${process.env.KNOWLEDGEBASE_ID}/generateAnswer`;

const qnaHeaders = {
  'Ocp-Apim-Subscription-Key': process.env.QNA_KEY,
};

function getAnswer(question) {
  debug('got question:', question);
  return new Promise((resolve, reject) => {
    request
      .post({ url: qnaUrl, headers: qnaHeaders, form: { question } })
      .then(res => {
        const data = JSON.parse(res);
        debug('got answers:', data);
        resolve(data.answers[0]);
      })
      .catch(debug);
  });
}

function postAnswer(data, channel) {
  debug('posting answer:', data);
  bot.postMessage(
    channel,
    data.score > 0 ? data.answer : ':panda_face:',
    messageOptions
  );
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
      getAnswer(message.text).then(data => postAnswer(data, message.channel));
    } else if (mentionsMe(message)) {
      debug('I was mentioned in this message:', message);
      getAnswer(getTextWithoutMention(message)).then(data =>
        postAnswer(data, message.channel)
      );
    }
  }
});
