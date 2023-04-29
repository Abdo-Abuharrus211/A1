const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');




const app = express();
//parse through the body of the request
app.use(express.urlencoded({ extended: false }));
//Deploy sessions
app.use(session({
    secret: 'c2b1b7c7-5f2b-4b23-99e3-be2504ff5f74',
    saveUninitialized: true,
    resave: false,
}));

// Users database array
const users = [
    {
        username: 'Bobz',
        password: 'Pie',
    },
    {
        username: 'admin',
        password: 'admin',
    }
]
/////////////////////////
// Public Routes
/////////////////////////

// Landing page
app.get('/', (req, res) => {
    // send two buttons one for sign up and one for login that will redirect to the respective pages
    res.send(
        `
        <h1>Welcome to whatever this is...</h1>
        <button type="button" onclick="location.href='/signup'">Sign Up</button>
        <button type="button" onclick="location.href='/login'">Login</button>
        `
    );
}
);

//User Login page
app.get('/login', (req, res) => {
    res.send(`
      <form action="/login" method="post">
        <input type="text" name="username" placeholder="Enter your username" />
        <input type="password" name="password" placeholder="Enter your password" />
        <input type="submit" value="Login"/>
      </form>
    `)
});

// GLOBAL_AUTHENTICATED = false;
app.post('/login', (req, res) => {
    //set global var to true if user is logged in
    // if (req.body.username === 'Bobz' && req.body.password === 'Pie') {
    if (users.find((user) => user.username === req.body.username && user.password === req.body.password)){
        req.session.GLOBAL_AUTHENTICATED = true;
    }
    res.redirect('/authenticated');
});

/////////////////////////
// Authenticated users only
/////////////////////////
const authenticatedOnly = (req, res, next) => {
    // TODO: check if user is authenticated
    if (!req.session.GLOBAL_AUTHENTICATED) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next(); //allow next route to run
};

app.use(authenticatedOnly);
app.get('/authenticated', authenticatedOnly, (req, res) => {
    console.log("You are authenticated");
    res.send('<h1>You are authenticated</h1>');
});



const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}.`));


// app.use(authenticatedSucccessfully) NEED THIS????????

// //User Signup page
// app.get('/signup', (req, res) => {
//     res.send(
//         `
//         <form action="/signup" method="post">
//         <input type="text" name="username" placeholder="Enter your username" />
//         <input type="password" name="password" placeholder="Enter your password" />
//         <input type="submit" value="Signup" />
//         </form>
//         `
//     );
// });


//User Login page, if user is logged in, redirect to home page that has their name and a logout button
// app.get('/home', (req, res) => {
//     if (req.session.loggedIn) {
//         res.send(
//             `
//             <h1>Hello, ${req.session.username}!</h1>
//             <button type="button" onclick="location.href='members'">Go to members Area</button>
//             <button type="button" onclick="location.href='logout'">Logout</button>
//             `
//         );
//     } else {
//         res.redirect('/');
//     }
// });