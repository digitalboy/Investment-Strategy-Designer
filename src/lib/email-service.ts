interface EmailOptions {
	to: string;
	subject: string;
	html: string;
}

export class EmailService {
	private apiKey?: string;

	constructor(apiKey?: string) {
		this.apiKey = apiKey;
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		if (!this.apiKey) {
			console.log('Mock sending email (No API Key provided):', options);
			return;
		}

		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					from: 'InvestBot <alerts@yourdomain.com>',
					to: [options.to],
					subject: options.subject,
					html: options.html,
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				console.error('Failed to send email via Resend:', error);
				throw new Error(`Email service error: ${response.statusText}`);
			}

			console.log(`Email sent to ${options.to}`);
		} catch (error) {
			console.error('Email sending failed:', error);
			// In a real production system, we might want to retry or log to a monitoring service
		}
	}
}
