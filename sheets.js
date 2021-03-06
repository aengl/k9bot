/**
 * Queries Q&A data from Google Sheets.
 */

const debug = require('debug')('sheets');
const { google } = require('googleapis');

const sheets = google.sheets('v4');
const jwt = new google.auth.JWT(
  process.env.GOOGLE_EMAIL,
  '.googlekeys.json',
  null,
  'https://www.googleapis.com/auth/spreadsheets.readonly'
);

/**
 * Authenticates with Google.
 * @returns {Promise} A promise.
 */
function authenticate() {
  debug('authenticating');
  return new Promise((resolve, reject) => {
    jwt.authorize(error => {
      if (error) {
        reject(error);
      } else {
        resolve(jwt);
      }
    });
  });
}

/**
 * Reads the first two columns of a specific sheet on Google Sheets, as
 * determined by SHEETS_KEY.
 * @returns {Promise} Promise of Google Sheet data.
 */
async function read() {
  const auth = await authenticate();
  return new Promise((resolve, reject) =>
    sheets.spreadsheets.values.get(
      {
        auth,
        spreadsheetId: process.env.SHEETS_KEY,
        range: 'Sheet1!A2:B1000',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    )
  );
}

module.exports = {
  read,
};
