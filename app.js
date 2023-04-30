const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const usersModel = require('./models/users');
const bcrypt = require('bcrypt');
const MongoDBStore = require('connect-mongodb-session')(session);

const app = express();
//parse through the body of the request
app.use(express.urlencoded({ extended: false }));

// save session data in MongoDB 
var dbStore = new MongoDBStore({
    uri: `mongodb+srv://${process.env.ATLAS_DB_USER}:${process.env.ATLAS_DB_PASSWORD}@cluster0.ozsghtt.mongodb.net/comp2537a1?retryWrites=true&w=majority`,
    collection: 'mySessions'
});
//Deploy sessions
app.use(session({
    secret: `${process.env.SESSIONS_SECRET}`, 
    store: dbStore,
    resave: false,
    saveUninitialized: false,
}));


/////////////////////////
// Public Routes
/////////////////////////

// Landing page
app.get('/', (req, res) => {
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



// //User Signup page
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


app.post('/login', async (req, res) => {
    //set global var to true if user is logg ed in
    const result = await usersModel.findOne({
        username: req.body.username,
    })
    if (result && bcrypt.compareSync(req.body.password, result.password)) {
        req.session.GLOBAL_AUTHENTICATED = true;
        req.session.loggedUsername = req.body.username;
        req.session.loggedPassword = req.body.password;
        res.redirect('/authenticated');
    }
    else {
        res.send('<h1>Invalid username or password</h1>');
    }
});

app.post('/signup', async (req, res) => {
    //check if username already exists
    const result = await usersModel.findOne({
        username: req.body.username,
    })
    if (result) {
        res.send('<h1>Username already exists</h1>');
    }
    else {
        //hash password
        const hashedPassword = bcrypt.hashSync(req.body.password, 10);
        //create new user
        const newUser = new usersModel({
            username: req.body.username,
            password: hashedPassword,
            type: 'regular user',
        });
        //save new user
        await newUser.save();
        res.redirect('/authenticated');  
    }
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
// This allows express to serve files in the public folder
app.use(express.static('public'));
app.get('/authenticated', authenticatedOnly, (req, res) => {
    console.log("You are authenticated");
    res.send(`<h1>You are authenticated</h1>
             <h1> Hello, ${req.session.loggedUsername}.</h1>
             <img src="basha00${Math.floor(Math.random() * 4) + 1}.JPG" alt="Basha" width="800">

    `);
});

//check if user is an Administator
const authenticatedAdminOnly = async (req, res, next) => {
    const result = await usersModel.findOne({
        username: req.session.loggedUsername,
    })
    if (result?.type != 'admin user') {
        console.log("You are not an Admin, Harry!");
        return res.send('<h1> You are not and admin, Harry'); //if not admin, return error
    }
    next(); //allow next route to run
};
app.use(authenticatedAdminOnly);
app.get('/authenticatedAdminsOnly', authenticatedAdminOnly, (req, res) => {
    console.log("You are an Admin, Harry!");
    res.send('<h1>You are an Admin, Harry!</h1>');
});

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

// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`App running on port ${port}.`));

app.get('*', (req, res) => {
    res.status(404).send('<h1> 404 Page not found</h1>');
  });
module.exports = app;