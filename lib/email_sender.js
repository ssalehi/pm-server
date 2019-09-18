const mailgun = require("mailgun-js");
const env = require('../env')

const mg = mailgun({ apiKey: env.emailAPIKey, domain: env.emailDomain });

const from = env.emailFrom;

const verificationSender = (to, link) => {

	const data = {
		from,
		to,
		subject: 'تایید ایمیل',
		template: env.emailTemplateVerification,
		'v:link': link
	};

	return send(data);
}

const send = (data) => {
	return new Promise((resolve, reject) => {
		mg.messages().send(data, function (error, body) {
			if (error) {
				console.log(`error on sending email for ${data.template} -> `, error);
				reject(error);
			} else {
				resolve(body);
			}
		});
	})
}


module.exports = {
	verificationSender
}