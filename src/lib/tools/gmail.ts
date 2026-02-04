
// Tools for Gmail Integration

export const gmailTools = [
    {
        name: "list_emails",
        description: "Lists the latest emails/threads from the user's inbox.",
        parameters: {
            type: "OBJECT",
            properties: {
                maxResults: {
                    type: "NUMBER",
                    description: "Number of emails to list (default 5, max 10)."
                }
            }
        }
    },
    {
        name: "search_emails",
        description: "Searches for emails matching a specific query.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: {
                    type: "STRING",
                    description: "Gmail search query (e.g., 'from:juan', 'subject:factura', 'is:unread')."
                },
                maxResults: {
                    type: "NUMBER",
                    description: "Number of results to return (default 5)."
                }
            },
            required: ["query"]
        }
    },
    {
        name: "create_email_draft",
        description: "Creates a draft email but does NOT send it. Use this when the user asks to 'prepare' or 'write' an email.",
        parameters: {
            type: "OBJECT",
            properties: {
                to: { type: "STRING", description: "Recipient email address" },
                subject: { type: "STRING", description: "Email subject" },
                body: { type: "STRING", description: "Email body content (text/html allowed). Format with <p>, <br>, <b>, etc." }
            },
            required: ["to", "subject", "body"]
        }
    },
    {
        name: "send_email",
        description: "Sends an email immediately. Use only when the user explicitly asks to SEND.",
        parameters: {
            type: "OBJECT",
            properties: {
                to: { type: "STRING", description: "Recipient email address" },
                subject: { type: "STRING", description: "Email subject" },
                body: { type: "STRING", description: "Email body content (text/html allowed). Format with <p>, <br>, <b>, etc." }
            },
            required: ["to", "subject", "body"]
        }
    }
];

// Helper: Decode Base64url
const decodeBase64 = (str: string) => {
    try {
        // Base64url to Base64
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        // Decode (browser compatible)
        return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
        return "[Content cannot be displayed]";
    }
};

const getHeader = (headers: any[], name: string) => {
    const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : "";
};

export async function listEmails(accessToken: string, maxResults: number = 5) {
    try {
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=label:INBOX`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error("Gmail API Error Body:", JSON.stringify(errorBody, null, 2));
            throw new Error(`Gmail API error: ${JSON.stringify(errorBody) || response.statusText}`);
        }

        const data = await response.json();
        if (!data.messages) return "No emails found.";

        const emails = [];
        for (const msg of data.messages) {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const detail = await detailRes.json();

            const subject = getHeader(detail.payload.headers, "Subject");
            const from = getHeader(detail.payload.headers, "From");
            const snippet = detail.snippet;

            emails.push({ id: msg.id, subject, from, snippet });
        }

        return emails;
    } catch (e: any) {
        throw new Error(`Failed to list emails: ${e.message}`);
    }
}

export async function searchEmails(accessToken: string, query: string, maxResults: number = 5) {
    try {
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Gmail API error: ${response.statusText}`);

        const data = await response.json();
        if (!data.messages) return `No emails found matching query: ${query}`;

        const emails = [];
        for (const msg of data.messages) {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const detail = await detailRes.json();

            const subject = getHeader(detail.payload.headers, "Subject");
            const from = getHeader(detail.payload.headers, "From");
            const snippet = detail.snippet;
            // Simplification: We avoid full body parsing here to safe tokens, unless requested specifically in future.

            emails.push({ id: msg.id, subject, from, snippet });
        }

        return emails;
    } catch (e: any) {
        throw new Error(`Failed to search emails: ${e.message}`);
    }
}

// Helper to construct raw email
const createRawEmail = (to: string, subject: string, body: string) => {
    // Encoded subject for non-ASCII characters
    const encodedSubject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

    const email = [
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        ``,
        body
    ].join('\r\n');

    return btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function createEmailDraft(accessToken: string, { to, subject, body }: any) {
    try {
        const raw = createRawEmail(to, subject, body);
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: { raw }
            })
        });

        if (!response.ok) throw new Error(`Gmail API error: ${response.statusText}`);
        const data = await response.json();
        return { success: true, message: `Draft created with ID: ${data.id}`, draftId: data.id };
    } catch (e: any) {
        throw new Error(`Failed to create draft: ${e.message}`);
    }
}

export async function sendEmail(accessToken: string, { to, subject, body }: any) {
    try {
        const raw = createRawEmail(to, subject, body);
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw })
        });

        if (!response.ok) throw new Error(`Gmail API error: ${response.statusText}`);
        const data = await response.json();
        return { success: true, message: `Email sent successfully! ID: ${data.id}`, messageId: data.id };
    } catch (e: any) {
        throw new Error(`Failed to send email: ${e.message}`);
    }
}
