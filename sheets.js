/**
 * Queries Q&A data from Google Sheets.
 */

const debug = require('debug')('sheets');
const fs = require('fs');
const google = require('googleapis');
const sheets = google.sheets('v4');

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

const jwt = new google.auth.JWT(
  process.env.GOOGLE_EMAIL,
  '.googlekeys.json',
  null,
  'https://www.googleapis.com/auth/spreadsheets.readonly'
);

function authenticate() {
  debug('authenticating');
  return new Promise((resolve, reject) => {
    jwt.authorize((error, result) => {
      if (error) {
        reject(error);
      } else {
        oauth2.setCredentials({
          access_token: result.access_token,
        });
        resolve(oauth2);
      }
    });
  });
}

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
