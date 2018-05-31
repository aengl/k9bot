**:warning: This project is no longer maintained!**

Microsoft has decided to move the QnA Maker service into the Azure ecosystem, which we have no interest in buying into. We migrated this bot to https://dialogflow.com. No coding required, therefore this repository no longer has a purpose.

# k9bot

`k9bot` is a QnA Slack chat bot based on the Microsoft QnA Maker Framework from Microsoft. Given a database of questions and answers, the bot will apply the QnA Maker natural language processing to determine the best answer given a certain question.

Have you gotten the question "what's our WiFi password?" one too many times? Well, time to take matters into your own hands and let `k9bot` answer it for you.

## Background

Who needs a QnA bot you ask? Co-living communities do. If you're curious who we are, check out this website https://www.techfarm.life/

## Prerequisites

If you happen to live at Tech Farm, it's best not to follow the steps listed here but to simply request the secrets from the repository maintainers. You know who we are!

### QnA Maker

This project is using the engine provided by QnA Maker from Microsoft to do the heavy lifting. You will therefore need a developer key from them.
https://azure.microsoft.com/en-us/services/cognitive-services/qna-maker/

1.  Make a Microsoft account
2.  Go to the QnA Maker website
3.  Get access to the API
4.  Keep an eye out for a bot token and a QnA key

### Google Sheets API

I don't know about you, but our guys do not want to go to the QnA Maker to maintain our QnA Database. Instead the bot gets its data from a Google Sheet containing questions on column A and answers on column B. In order for the bot to get access to this, you will need to give it access to the sheet.

Ok, are you ready for this? This is going to be a bumpy ride!

#### 1. Go to https://developers.google.com/sheets/

#### 2. Make an account

#### 3. Create a project

1.  Click on the down arrow next to the Google logo on the top left
2.  Click on the `Manage Resources` button on the right of the search bar
3.  Click on the `Create project` button on the top, next to `Manage resources`
4.  Select your new project (click on the down arrow next to the Google logo again)

#### 4. Give API access to your project

1.  Select the `Dashboard` tab on the left
2.  Click `Enable API` in the header, next to `Dashboard`
3.  Select `G Suite APIs` -> `Sheets API`

#### 5. Create Service Credentials

1.  Select the `Credentials` tab on the left
2.  Click `Create credentials` -> `Service Account Key`
3.  `Select Account` -> `New Service Account`
4.  In role, choose `Project` -> `Viewer`
5.  `Key type` -> `Json`
6.  The newly created `json` file for your credential should be automatically downloaded.

### What do I do with all of this stuff?

After you clone this repository, you will need to create two files for the bot to get access to the two services:

The first file you will need to provide with information yourself. The bot token is provided by Slack, the QnA key by QnA maker and the sheets key by Google.

**.env**

```
DEBUG='*'
BOT_TOKEN=[your-bot-token-here]
QNA_KEY=[your-qna-key-here]
SHEETS_KEY=[your-google-sheets-key-here]
```

The second file is generated for you by Google (See `Google Sheets API 5.6`).

**.googlekeys.json**

```
{
  "type": "service_account",
  "project_id": "[your-project-id]",
  "private_key_id": "[your-private-key-id]",
  "private_key": "-----BEGIN PRIVATE KEY-----[long string of random characters here]-----END PRIVATE KEY-----\n",
  "client_email": "[your-bot-server]@[your-bot-name].iam.gserviceaccount.com",
  "client_id": "[your-client-id]",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/[your-bot-server-your-bot-name].iam.gserviceaccount.com"
}
```

## Installation

> Ok, got everything. How do I run?

Wow! Didn't expect that 😆. Good job! 🎉

If you're intending to write code, run:

    make dev

If it doesn't work you may have to adjust the command to your shell, check the `Makefile` for details.

If you just want to build a Docker container, run this instead:

    make build

### Raspberry Pi

If you don't plan to run Docker on your RasPi, be aware that the version of `nodejs` that comes with Raspbian is too old. Follow this guide to install a version >=8: https://github.com/nodesource/distributions#installation-instructions
