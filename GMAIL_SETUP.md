# Gmail API Setup Guide

This guide explains how to set up Gmail API credentials for reading and sending emails.

## Prerequisites

- A Google account with Gmail enabled
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Water Order Bot")
4. Click "Create"

## Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" for user type
   - Fill in the required fields (app name, user support email, developer email)
   - Add your email to "Test users"
   - Save and continue
4. Back in "Create OAuth client ID":
   - Choose "Desktop app" as application type
   - Enter a name (e.g., "Water Order Bot Client")
   - Click "Create"
5. Download the credentials JSON file (or copy the Client ID and Client Secret)

## Step 4: Generate Refresh Token

You need to generate a refresh token by authorizing the application to access your Gmail account.

### Option 1: Using Node.js Script

Create a file `scripts/get-gmail-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'your_client_id_here';
const CLIENT_SECRET = 'your_client_secret_here';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token', err);
      return;
    }
    console.log('Refresh token:', token.refresh_token);
  });
});
```

Run the script:
```bash
node scripts/get-gmail-token.js
```

Follow the instructions to get your refresh token.

### Option 2: Using OAuth 2.0 Playground

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In "Step 1", scroll to "Gmail API v1" and select both:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
6. Click "Authorize APIs"
7. Sign in with your Google account and grant permissions
8. In "Step 2", click "Exchange authorization code for tokens"
9. Copy the "Refresh token"

## Step 5: Configure Environment Variables

### For Local Development

Add the following to your `local.settings.json` file:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GMAIL_CLIENT_ID": "your_client_id_here",
    "GMAIL_CLIENT_SECRET": "your_client_secret_here",
    "GMAIL_REFRESH_TOKEN": "your_refresh_token_here",
    "EMAIL_SENDER_FILTER": "sender@example.com",
    "EMAIL_ORDER_SUBJECT": "Water Order",
    "EMAIL_ORDER_BODY": "Please deliver water",
    "TELEGRAM_BOT_TOKEN": "your_telegram_bot_token",
    "WHITELISTED_USER_IDS": "your_telegram_user_id",
    "AZURE_STORAGE_CONNECTION_STRING": "your_storage_connection_string"
  }
}
```

Replace:
- `your_client_id_here` with your OAuth Client ID
- `your_client_secret_here` with your OAuth Client Secret
- `your_refresh_token_here` with the refresh token you generated
- `sender@example.com` with the email address you want to send orders to and monitor

### For Azure Production

Set the environment variables in Azure Function App:

```bash
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group yozh \
  --settings \
    GMAIL_CLIENT_ID=your_client_id \
    GMAIL_CLIENT_SECRET=your_client_secret \
    GMAIL_REFRESH_TOKEN=your_refresh_token \
    EMAIL_SENDER_FILTER=sender@example.com \
    EMAIL_ORDER_SUBJECT="Water Order" \
    EMAIL_ORDER_BODY="Please deliver water"
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete Azure deployment instructions.

## Step 6: Test the Feature

1. Build and run the bot locally:
   ```bash
   npm install
   npm run build
   npm start
   ```

2. Set your Telegram bot webhook to the local endpoint (using ngrok):
   ```bash
   ngrok http 7071
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
     -d "url=https://your-ngrok-url.ngrok.io/api/telegram-webhook"
   ```

3. In Telegram, send `/start` to your bot
4. Click the "Read latest email" button
5. The bot should fetch and display the latest email from the configured sender

## Troubleshooting

### "Gmail credentials not configured" error
- Make sure all four environment variables are set in your `.env` file
- Restart the bot after updating `.env`

### "Error fetching email" error
- Check that the Gmail API is enabled in your Google Cloud project
- Verify your refresh token is valid (tokens can expire)
- Check the bot logs for detailed error messages
- Ensure your Google account has the Gmail API permissions

### "No emails found" message
- Verify the `EMAIL_SENDER_FILTER` matches the exact sender email address
- Check that you have emails from that sender in your Gmail inbox
- The filter is case-sensitive for some email providers

## Security Notes

- **Never commit** your `.env` file with real credentials to Git
- Keep your Client Secret and Refresh Token confidential
- The refresh token provides long-term access to your Gmail - store it securely
- Consider using a dedicated Gmail account for the bot rather than your personal account
- For production deployments, use secure secret management (Azure Key Vault, AWS Secrets Manager, etc.)
