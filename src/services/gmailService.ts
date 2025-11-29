import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface EmailData {
  date: string;
  subject: string;
  body: string;
  sender: string;
}

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail;

  constructor() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail credentials not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob' // For installed apps
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Fetch the latest email from a specific sender
   */
  async getLatestEmailFromSender(senderEmail: string): Promise<EmailData | null> {
    try {
      // Search for emails from the specific sender
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `from:${senderEmail}`,
        maxResults: 1,
      });

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        return null;
      }

      // Get the full message details
      const messageId = messages[0].id!;
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      // Extract headers
      const headers = message.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender';
      const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

      // Extract body
      const body = this.extractBody(message.data.payload);

      return {
        date: dateHeader,
        subject,
        body,
        sender: from,
      };
    } catch (error) {
      console.error('Error fetching email:', error);
      throw error;
    }
  }

  /**
   * Extract email body from message payload
   */
  private extractBody(payload: any): string {
    let body = '';

    if (payload.body?.data) {
      // Simple case: body is directly in payload
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
      // Multipart message: look for text/plain or text/html
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
          // Fallback to HTML if no plain text found
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          // Nested parts
          body = this.extractBody(part);
          if (body) break;
        }
      }
    }

    return body || 'No content';
  }

  /**
   * Send an email and return the message ID
   */
  async sendEmail(to: string, subject: string, body: string): Promise<string> {
    try {
      // Create email in RFC 2822 format
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ].join('\n');

      // Encode in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send the email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      const messageId = response.data.id || '';
      console.log(`Email sent successfully to ${to} (ID: ${messageId})`);
      return messageId;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Check for replies to emails with a specific subject
   * Returns the latest reply if found
   */
  async checkForReply(senderEmail: string, subjectContains: string, afterDate: Date): Promise<EmailData | null> {
    try {
      // Format date for Gmail query (YYYY/MM/DD)
      const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');

      // Search for emails from sender with subject containing our order subject, after the order date
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `from:${senderEmail} subject:"${subjectContains}" after:${dateStr}`,
        maxResults: 5, // Get last 5 to find the latest reply
      });

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        return null;
      }

      // Get the most recent message (first in the list)
      const messageId = messages[0].id!;
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      // Extract headers
      const headers = message.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender';
      const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

      // Extract body
      const body = this.extractBody(message.data.payload);

      return {
        date: dateHeader,
        subject,
        body,
        sender: from,
      };
    } catch (error) {
      console.error('Error checking for reply:', error);
      return null;
    }
  }
}
