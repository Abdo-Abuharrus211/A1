const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');




const app = express();

//parse through the body of the request
app.use(express.urlencoded({ extended: false }));


app.get('/', (req, res) => {
    // send two buttons one for sign up and one for login that will redirect to the respective pages
    res.send(
        `
        <h1>Welcome to whatever this is...</h1>
        <button type="button" onclick="location.href='signup.html'">Sign Up</button>
        <button type="button" onclick="location.href='login.html'">Login</button>
        `
    );
}
);

// only for authenticated users
const authenticatedSucccessfully = (req, res, next) => {
    next()
}



//User Signup page
app.get('/signup', (req, res) => {
    res.send(
        `
        <form action="/signup" method="post">
        <input type="text" name="username" placeholder="Enter your username" />
        <input type="password" name="password" placeholder="Enter your password" />
        <input type="submit" value="Signup" />
        </form>
        `
    );
});

//User Login page
app.get('/login', (req, res) => {
    res.send(`
      <form action="/login" method="post">
        <input type="text" name="username" placeholder="Enter your username" />
        <input type="password" name="password" placeholder="Enter your password" />
        <input type="submit" value="Login" />
      </form>
    `)
  
  });

//User Login page, if user is logged in, redirect to home page that has their name and a logout button
app.get('/home', (req, res) => {
    if (req.session.loggedIn) {
        res.send(
            `
            <h1>Hello, ${req.session.username}!</h1>
            <button type="button" onclick="location.href='members'">Go to members Area</button>
            <button type="button" onclick="location.href='logout'">Logout</button>
            `
        );
    } else {
        res.redirect('/');
    }
});






const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}.`));
