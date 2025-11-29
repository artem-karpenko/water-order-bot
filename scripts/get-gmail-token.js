const { google } = require('googleapis');
const readline = require('readline');

// Replace these with your OAuth credentials from Google Cloud Console
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'your_client_id_here';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || 'your_client_secret_here';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Request read and send access to Gmail
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Force consent screen to get refresh token
});

console.log('='.repeat(70));
console.log('Gmail API Token Generator');
console.log('='.repeat(70));
console.log('');
console.log('Step 1: Authorize this app by visiting this URL:');
console.log('');
console.log(authUrl);
console.log('');
console.log('Step 2: Sign in with your Google account and grant permissions');
console.log('Step 3: Copy the authorization code from the browser');
console.log('');
console.log('='.repeat(70));
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code here: ', (code) => {
  rl.close();

  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('');
      console.error('Error retrieving access token:', err.message);
      console.error('');
      console.error('Troubleshooting:');
      console.error('- Make sure you copied the entire authorization code');
      console.error('- The code expires quickly - try generating a new one');
      console.error('- Verify your CLIENT_ID and CLIENT_SECRET are correct');
      return;
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('Success! Your tokens:');
    console.log('='.repeat(70));
    console.log('');
    console.log('Access Token (short-lived):');
    console.log(token.access_token);
    console.log('');

    if (token.refresh_token) {
      console.log('Refresh Token (use this in your .env file):');
      console.log(token.refresh_token);
      console.log('');
      console.log('Add this to your .env file:');
      console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
    } else {
      console.log('WARNING: No refresh token received.');
      console.log('This can happen if you\'ve already authorized this app.');
      console.log('To fix: Go to https://myaccount.google.com/permissions');
      console.log('Remove this app and run the script again.');
    }

    console.log('');
    console.log('='.repeat(70));
  });
});
