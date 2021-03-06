const User = require("../model/user");
const { hash, compare } = require("bcryptjs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sign } = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { registervalidate } = require("../validation");
const sendgridTransport = require("nodemailer-sendgrid-transport");
require("dotenv").config();
// Send mail after register
const transporter = nodemailer.createTransport(
	sendgridTransport({
		auth: {
			api_key: process.env.API_KEY,
		},
	}),
);
module.exports = {
	GetUser: (req, res) => {
		User.find()
			.then((user) => {
				res.json(user);
			})
			.catch((err) => {
				res.json({ message: err });
			});
	},

	Register: async (req, res) => {
		const { error } = registervalidate(req.body);
		if (error) return res.json({ message: error.details[0].message });
		// Check existing user
		const emailexit = await User.findOne({ email: req.body.email });
		if (emailexit) return res.json({ message: "Email alredy exists" });
		// Check existing user
		const mobileCheck = await User.findOne({ mobile: req.body.mobile });
		if (mobileCheck) return res.json({ message: "Mobile no already exists" });
		// hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(req.body.password, salt);
		const user = new User({
			name: req.body.name,
			email: req.body.email,
			mobile: req.body.mobile,
			password: hashedPassword,
		});
		try {
			const savedUser = await user.save();
			await transporter.sendMail({
				to: savedUser.email,
				from: process.env.G_NAME,
				subject: "Account register successfully",
				html: `<div>
				<h1>Welcome to Social-Blog</h1>
				<h3>Here is your account details</h3>
				</br>
				<p>Name:${savedUser.name}</p> </br>
				<p>Email:${savedUser.email}</p> </br>
				<p>Mobile:${savedUser.mobile}</p>
				<p>Thank you for choosing us!</p>
			</div>
		`,
			});
			const token = sign(
				{ email: user.email, id: user._id },
				process.env.SECRET_KEY,
				{ expiresIn: "1d" },
			);
			res.json({ token: token, user: savedUser });
		} catch (err) {
			res.json(err.message);
		}
	},
};
