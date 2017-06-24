/**
 * Interacts with Microsoft's QnA maker service.
 */

const debug = require('debug')('qna');
const request = require('request-promise-native');

const url = `https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/`;

const headers = {
  'Ocp-Apim-Subscription-Key': process.env.QNA_KEY,
};

/**
 * Creates a new knowledge base.
 *
 * @param {string} name Knowledge base name.
 * @param {array} qnapairs Array of question/answer objects.
 * @returns {Promise} The id of the newly created knowledge base.
 */
function createKnowledgeBase(name, qnapairs) {
  debug('creating knowledge base');
  return new Promise((resolve, reject) => {
    request
      .post({
        url: url + `knowledgebases/create`,
        headers,
        form: {
          name,
          qnapairs,
        },
      })
      .then(res => {
        const data = JSON.parse(res);
        debug('new knowledge base:', data);
        resolve(data.kbId);
      })
      .catch(debug);
  });
}

/**
 * Deletes an existing knowledge base.
 *
 * @param {string} kbId The knowledge base id.
 * @returns {Promise} A promise.
 */
function deleteKnowledgeBase(kbId) {
  debug('deleting knowledge base:', kbId);
  return new Promise((resolve, reject) => {
    request
      .delete({
        url: url + `knowledgebases/${kbId}`,
        headers,
      })
      .catch(debug);
  });
}

/**
 * Queries the knowledge base for a question and returns the answer as an
 * object.
 *
 * @param {string} kbId The knowledge base id.
 * @param {Object} question The question to query the KB with.
 * @returns {Promise} A promise of an answer object.
 */
function getAnswer(kbId, question) {
  debug('got question:', question);
  return new Promise((resolve, reject) => {
    request
      .post({
        url: url + `knowledgebases/${kbId}/generateAnswer`,
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
 * @param {string} kbId The knowledge base id.
 * @param {string} question The question to add.
 * @param {string} answer The answer to the question.
 * @param {string} channel The channel to post an acknowledgement to.
 * @returns {Promise} A promise.
 */
function addAnswer(kbId, question, answer, channel) {
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
      .patch({ url: url + `knowledgebases/${kbId}`, headers, body })
      .then(() => publish(kbId).then(resolve))
      .catch(debug);
  });
}

/**
 * Publishes the knowledge base. Necessary to make any changes live.
 * @param {string} kbId The knowledge base id.
 * @returns {Promise} A promise.
 */
function publish(kbId) {
  debug('publishing knowledge base');
  return request
    .put({ url: url + `knowledgebases/${kbId}`, headers })
    .catch(debug);
}

module.exports = {
  createKnowledgeBase,
  deleteKnowledgeBase,
  getAnswer,
  addAnswer,
  publish,
};
