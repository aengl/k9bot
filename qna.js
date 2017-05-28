const debug = require('debug')('qna');
const request = require('request-promise-native');

const url = `https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/${process.env.KNOWLEDGEBASE_ID}/`;

const headers = {
  'Ocp-Apim-Subscription-Key': process.env.QNA_KEY,
};

/**
 * Queries the knowledge base for a question and returns the answer as an
 * object.
 *
 * @param {Object} question The question to query the KB with.
 * @returns {Promise} A promise of an answer object.
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
 * Adds a QnA pair to the knowledge base.
 *
 * @param {string} question The question to add.
 * @param {string} answer The answer to the question.
 * @param {string} channel The channel to post an acknowledgement to.
 * @returns {Promise} A promise.
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
        publish().then(resolve);
      })
      .catch(debug);
  });
}

/**
 * Publishes the knowledge base. Necessary to make any changes live.
 * @returns {Promise} A promise.
 */
function publish() {
  debug('publishing knowledge base');
  return request.put({ url, headers });
}

module.exports = {
  getAnswer,
  addAnswer,
  publish,
};
