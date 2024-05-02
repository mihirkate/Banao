const express = require("express");
const app = express();
const port = 3000;
const User = require("./models/user");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const passwordReset = require("./models/passwordReset");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const uuid = require("uuid");

// -----------------------------------------------------------------
app.set("view engine", "ejs");

// -----------------------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// -----------------------------------------------------------------

app.get("/", (req, res) => {
  res.send("Hii from root ");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

///---------------------Signup route-------------------

app.post("/signup", async (req, res) => {
  // Implement user signup logic

  const data = {
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  };
  console.log(data);

  const existingUser = await User.findOne({ username: data.username });
  console.log(existingUser);
  if (existingUser) {
    return res.send("User exists ,Try WIth different username ");
  } else {
    const saltrounds = 10;
    const hashedPassoword = await bcrypt.hash(data.password, saltrounds);
    data.password = hashedPassoword;
    console.log(data.password);

    const userData = await User.insertMany(data);
    console.log(userData);
  }
  res.render("login");
});
// -----------------------------------Login Route--------------------

app.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });

  console.log(user);

  if (!user) {
    // Return here to stop execution after sending response
    return res.send("Username not found");
  }
  try {
    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (isPasswordMatch) {
      // Redirect to the home page or render it, only if password matches
      return res.render("home");
    } else {
      // Return here to stop execution after sending response
      return res.status(401).send("Wrong password");
    }
  } catch (error) {
    console.log(error);
    // Return here to ensure no further processing happens after catching an error
    return res.send("Wrong details");
  }
});

// Setup the Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "Gmail", // For example, using Gmail
  auth: {
    user: "your-email@gmail.com",
    pass: "your-password",
  },
});
// -----------------------------------Forget password Route--------------------

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const userData = await User.findOne({ email });
  console.log(userData);

  if (!userData) {
    res.json({
      msg: "User not exists",
    });
  }
  // Generate password reset token (example using uuid)
  const token = uuid.v4();

  // Save token in database (example using mongoose)
  await passwordReset.create({ user_id: userData._id, token });

  // Send password reset email (example using nodemailer)
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;
  const mailOptions = {
    from: "your-email@example.com",
    to: email,
    subject: "Password Reset",
    html: `Click <a href="${resetLink}">here</a> to reset your password.`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res
        .status(500)
        .json({ error: "Failed to send password reset email" });
    }
    console.log("Password reset email sent:", info.response);
    res.json({ message: "Password reset email sent successfully" });
  });
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  // Find password reset entry by token
  const resetEntry = await passwordReset.findOne({ token });
  if (!resetEntry) {
    return res.status(404).json({ error: "Invalid or expired token" });
  }

  // Update user's password (example using bcrypt)
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne(
    { _id: resetEntry.user_id },
    { password: hashedPassword }
  );

  // Delete password reset entry from database
  await passwordReset.deleteOne({ token });

  res.json({ message: "Password reset successful" });
});

// ------------------------------------------------
app.listen(port, () => {
  console.log("listening to the server ", port);
});
