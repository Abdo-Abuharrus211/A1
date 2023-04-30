const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const usersModel = require('./models/users');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const MongoDBStore = require('connect-mongodb-session')(session);
const dotenv = require('dotenv');
dotenv.config();

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

const app = express();
//parse through the body of the request
app.use(express.urlencoded({ extended: false }));

// save session data in MongoDB 
var dbStore = new MongoDBStore({
    uri: `mongodb+srv://${process.env.ATLAS_DB_USER}:${process.env.ATLAS_DB_PASSWORD}@cluster0.ozsghtt.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`,
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
        <h1>Welcome to Cat Cookies 101, let's begin.</h1>
        <button type="button" onclick="location.href='/signup'">Sign Up</button>
        <button type="button" onclick="location.href='/login'">Login</button>
        `
    );
}
);

//User Login page
app.get('/login', (req, res) => {
    const errorMessage = req.query.error;
    res.send(
        `
        <h3>Login:</h3>
        <form action="/login" method="post">
        <input type="text" name="username" placeholder="Enter your username" />
        <br>
        <input type="password" name="password" placeholder="Enter your password" />
        <br>
        <input type="submit" value="Login"/>
        </form>
        ${errorMessage ? `<p>${errorMessage}</p>` : ''}
        `)
});



// //User Signup page
app.get('/signup', (req, res) => {
    res.send(
        `
        <h3>Sign Up:</h3>
        <form action="/signup" method="post">
        <input type="text" name="username" placeholder="Enter your username" />
        <br>
        <input type="password" name="password" placeholder="Enter your password" />
        <br>
        <input type="submit" value="Signup" />
        </form>
        `);
});


app.post('/login', async (req, res) => {
    //set global var to true if user is logg ed in
    // sanitize the input using Joi
    const schema = Joi.object({
        password: Joi.string()
    })

    try {
        console.log("req.body.password " + req.body.password);
        const value = await schema.validateAsync({ password: req.body.password });
    }
    catch (err) {
        console.log(err);
        console.log("The password has to be a string");
        return
    }

    try {
        const result = await usersModel.findOne({
            username: req.body.username
        })
        if (result && bcrypt.compareSync(req.body.password, result.password)) {
            req.session.GLOBAL_AUTHENTICATED = true;
            req.session.loggedUsername = req.body.username;
            req.session.loggedPassword = req.body.password;
            req.session.cookie.maxAge = expireTime;
            res.redirect('/members');
        }
        else {
            res.redirect('/login?error=Invalid%20username/password%20combination');
        }
    } catch (error) {
        console.log(error);
    }
});

app.post('/signup', async (req, res) => {
    try {
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
            // log in the newly created user automatically by creating a new session then redirect to members page
            req.session.GLOBAL_AUTHENTICATED = true;
            req.session.loggedUsername = req.body.username;
            req.session.loggedPassword = req.body.password;
            res.redirect('/members');
        }
    }
    catch (err) {
        console.log(err);
        res.send('<h1>Something went wrong</h1>');
    }
});

// I want the user to be able to logout and destroy the session from mongoDB database
// and if the session is deleted for anyreason, the user should be logged out automatically
// then redirect to the root route
app.post('/logout', (req, res) => {
    req.session.destroy();
    // delete session from MongoDB database
    dbStore.destroy(req.sessionID, (err) => {
        if (err) {
            console.log(err);
        }
    });
    res.redirect('/');
});


/////////////////////////
// Authenticated users only
/////////////////////////
const authenticatedOnly = (req, res, next) => {
    // TODO: check if user is authenticated
    if (!req.session.GLOBAL_AUTHENTICATED) {
        res.redirect('/login?error=Access%20 denied%20-%20401');;
    }
    next(); //allow next route to run
};

app.use(authenticatedOnly);
// This allows express to serve files in the public folder
app.use(express.static('public'));
app.get('/members', authenticatedOnly, (req, res) => {
    console.log("You are authenticated");
    res.send(`<h1>You are authenticated</h1>
             <h1> Hello, ${req.session.loggedUsername}.</h1>
             <img src="basha00${Math.floor(Math.random() * 7) + 1}.JPG" alt="Basha" width="800">
             <br>
            <form action="/logout" method="post">
            <input type="submit" value="Logout" />
            </form>`);
});

//check if user is an Administator
const authenticatedAdminOnly = async (req, res, next) => {
    // add try catch to handle errors
    try {
        const result = await usersModel.findOne({ username: req.session.loggedUsername }
        )
        if (result?.type != 'admin user') {
            console.log("You are not an Admin, Harry!");
            return res.send(`<h1> You are not and admin, ${result.username}`); //if not admin, return error
        }
        next(); //allow next route to run
    } catch (error) {
        console.log(error);

    };
};

app.use(authenticatedAdminOnly);
app.get('/authenticatedAdminsOnly', authenticatedAdminOnly, (req, res) => {
    console.log("You are an Admin, Harry!");
    res.send(`<h1>You are an Administrator!</h1>`);
});

app.get('*', (req, res) => {
    res.status(404).send(`
    <h1> 404 Page not found</h1>
    <img src="404gifcat.gif" alt="Error 404" width="1000">
    `);
});


// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`App running on port ${port}.`));
module.exports = app;