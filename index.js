require('dotenv').config();

const debug = require('debug')('index');
const request = require('request-promise-native');
const SlackBot = require('slackbots');

const bot = new SlackBot({
  token: process.env.BOT_TOKEN,
  name: 'k9',
});

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
        resolve(data.answers[0].answer);
      })
      .catch(debug);
  });
}

bot.on('message', data => {
  // debug(data);
  if (data.type === 'desktop_notification' && data.content) {
    const mentionIndex = data.content.indexOf('@k9');
    if (mentionIndex) {
      const question = data.content.substr(mentionIndex + 4);
      getAnswer(question).then(answer =>
        bot.postMessage(data.channel, answer, messageOptions)
      );
    }
  }
});
