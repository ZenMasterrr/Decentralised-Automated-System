// This script is executed by the Chainlink Functions service.
// It uses the arguments passed from the smart contract to send an email.

const to = args[0];
const subject = args[1];
const body = args[2];

if (!secrets.smtpPassword) {
  throw Error("SMTP_PASSWORD environment variable not set");
}

const emailRequest = Functions.makeHttpRequest({
  url: "https://api.sendgrid.com/v3/mail/send", 
  method: "POST",
  headers: {
    "Authorization": `Bearer ${secrets.sendgridApiKey}`,
    "Content-Type": "application/json",
  },
  data: {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: "your-verified-sendgrid-email@example.com" },
    subject: subject,
    content: [{ type: "text/plain", value: body }],
  },
});

const [response] = await Promise.all([emailRequest]);

return Functions.encodeString(response.data);
