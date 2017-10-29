const debug = require('debug')('slack');
const slack = require('slack');
const WebSocket = require('ws');

module.exports = class Slackbot {
  constructor(token) {
    this.token = token;
    this.lastPongId = 0;
    this.lastPongReceived = null;
    this.botUserId = null;
    this.webSocket = null;
    this.eventHandlers = {};

    this.isBotMessage = message => message.subtype === 'bot_message';
    this.isDirectMessage = message =>
      message.channel && message.channel[0] === 'D';
    this.isFromMe = message => message.user === this.botUserId;
    this.mentionsMe = message =>
      message.text && message.text.indexOf(`<@${this.botUserId}>`) >= 0;
    this.getTextWithoutMention = message =>
      message.text && message.text.replace(/<.+>/gi, '').trim();
  }

  on(handler, callback) {
    this.eventHandlers[handler] = callback;
  }

  connect() {
    debug('connecting');
    return new Promise(resolve => {
      slack.rtm.connect({ token: this.token }).then(data => {
        this.botUserId = data.self.id;
        this.connectRTM(data.url);
        resolve();
      });
    });
  }

  /**
   * Connects to Slack's RTM interface.
   * @param {string} url WebSocket address to connect to
   */
  connectRTM(url) {
    debug('opening websocket connection to', url);
    this.webSocket = new WebSocket(url, {});
    this.webSocket.on('open', () => debug('websocket connection established'));
    this.webSocket.on('message', s => this.processMessage(JSON.parse(s)));
    this.webSocket.on('close', () => debug('websocket connection lost'));
    setInterval(() => this.ping(), 5000);
  }

  ping() {
    if (this.lastPongId && !this.lastPongReceived) {
      debug('did not get pong, reconnecting');
      this.connect();
    } else {
      this.lastPongId += 1;
      this.lastPongReceived = false;
      const payload = {
        id: this.lastPongId,
        type: 'ping',
      };
      debug('ping', payload);
      this.webSocket.send(JSON.stringify(payload));
    }
  }

  /**
   * Processes incoming websocket data.
   * @param {object} message JSON data.
   */
  processMessage(message) {
    if (message.type === 'pong') {
      this.processPong(message);
    } else if (message.type === 'message' && message.text) {
      this.processChatMessage(message);
    }
  }

  processPong(message) {
    debug('pong', message);
    if (message.reply_to === this.lastPongId) {
      this.lastPongReceived = true;
    }
  }

  processChatMessage(message) {
    const messageHandler = this.eventHandlers['chatMessage'] || (() => {});
    if (!this.isBotMessage(message) && !this.isFromMe(message)) {
      if (this.isDirectMessage(message)) {
        debug('I got a direct message:', message);
        messageHandler(message.text, message.channel);
      } else if (this.mentionsMe(message)) {
        debug('I was mentioned in this message:', message);
        messageHandler(getTextWithoutMention(message), message.channel);
      }
    }
  }

  /**
   * Makes the bot send a message to a Slack channel.
   *
   * @param {string} channel Channel to post the message in.
   * @param {string} text The message text.
   * @returns {Promise} A promise of a response object.
   */
  say(channel, text) {
    return new Promise(resolve =>
      slack.chat.postMessage(
        {
          token: this.token,
          channel,
          text,
          as_user: true,
        },
        resolve
      )
    );
  }
};
