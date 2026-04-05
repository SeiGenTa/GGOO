import { Resend } from 'resend';

const apiKey = process.env.RESEND_KEY;
const fromEmail = process.env.FROM_EMAIL || "dev"
const logsEmails = process.env.LOGS_EMAILS ? process.env.LOGS_EMAILS.toLowerCase() === 'true' : true;

const resend = new Resend(apiKey ?? "");

export const sendEmail = async (to: string, subject: string, html: string) => {
    if (!apiKey) {
        console.error('Resend API key is not set. Please set RESEND_KEY in your environment variables.');
        console.log("Email content:");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML: ${html}`);
        return;
    }
    const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
    });

    if (error) {
        console.error('Error sending email:', error);
    } else if (logsEmails) {
        console.log('Email sent successfully:', data);
    }
}