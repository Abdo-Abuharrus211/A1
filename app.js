const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const usersModel = require('./models/users');
const bcrypt = require('bcrypt');
const MongoDBStore = require('connect-mongodb-session')(session);
const ejs = require('ejs');
const Joi = require('joi');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
//parse through the body of the request
app.use(express.urlencoded({ extended: false }));
//Setting the view engine to ejs
app.set('view engine', 'ejs');
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
    cookie: {
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));


/////////////////////////
// Public Routes
/////////////////////////

// Landing page
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/nosql-injection', async (req, res) => {
    var username = req.query.user;

    if (!username) {
        res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
        return;
    }
    console.log("user: " + username);

    const schema = Joi.string().max(20).required();
    const validationResult = schema.validate(username);

    //If we didn't use Joi to validate and check for a valid URL parameter below
    // we could run our userCollection.find and it would be possible to attack.
    // A URL parameter of user[$ne]=name would get executed as a MongoDB command
    // and may result in revealing information about all users or a successful
    // login without knowing the correct password.
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
        return;
    }

    const result = await userCollection.find({ username: username }).project({ username: 1, password: 1, _id: 1 }).toArray();

    console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});


/////////////////////////
// Get Routes
/////////////////////////


//User Login page
app.get('/login', (req, res) => {
    const errorMessage = req.query.error;
    res.render('login', { title: 'Login', errorMessage: errorMessage });
});


// User Signup page
app.get('/signup', (req, res) => {
    const errorMessage = req.query.error;
    res.render('signup', { title: 'Signup', errorMessage: errorMessage })
});


/////////////////////////
// Post Routes
/////////////////////////

app.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().max(20).required()
    });

    try {
        await schema.validateAsync({ email, password });
    } catch (err) {
        console.log(err);
        res.redirect('/login?error=Invalid%20username/password%20combination');
        return;
    }

    const result = await usersModel.findOne({
        email: req.body.email,
    })
    console.log(result);
    if (result && bcrypt.compareSync(req.body.password, result.password)) {
        req.session.GLOBAL_AUTHENTICATED = true;
        req.session.loggedUsername = result.username;
        req.session.loggedEmail = req.body.email;
        req.session.loggedPassword = req.body.password;
        req.session.type = result.type;
        res.redirect('/members');
    }
    else {
        res.redirect('/login?error=Invalid%20username/password%20combination');
    }
});


app.post('/signup', async (req, res) => {
    try {
        const schema = Joi.object({
            username: Joi.string().alphanum().max(30).required(),
            email: Joi.string().required(),
            password: Joi.string().alphanum().max(30).required(),
        });

        const newUser = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
        };

        // If validation fails, redirect to signup page with error message
        const validationResult = schema.validate(newUser);
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.redirect(`/signup?error=${encodeURIComponent(validationResult.error.details[0].message)}`);
            return;
        }

        const result = await usersModel.findOne({
            username: req.body.username,
        });

        if (result) {
            // res.send('<h1>Username already exists</h1>');
            res.redirect('/signup?error=Username%20already%20exists');
        }
        else {
            //hash password
            const hashedPassword = bcrypt.hashSync(req.body.password, 10);
            //create new user
            const newUser = new usersModel({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword,
                type: 'regular user',
            });
            //save new user
            await newUser.save();
            req.session.GLOBAL_AUTHENTICATED = true;
            req.session.loggedUsername = req.body.username;
            req.session.loggedEmail = req.body.email;
            req.session.loggedPassword = req.body.password;
            req.session.type = "regular user";
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
// Middleware
/////////////////////////

function isValidSession(req) {
    if (req.session.GLOBAL_AUTHENTICATED) {
        return true
    } else {
        return false
    }
}

function validateSession(req, res, next) {
    if (isValidSession(req, res, next)) {
        next();
    } else {
        res.redirect('/login');
    }
}

// give me a function that checks if the logged in user's type is admin

function isAdmin(req) {
    if (req.session.type === 'admin') {
        return true
    } else {
        return false
    }
}

function validateAdmin(req, res, next) {
    if (isAdmin(req, res, next)) {
        next();
    } else {
        // show message that you are not an admin
        res.status(403).send(`
        <h1> You are not an admin, ${req.session.loggedUsername}!</h1>
        <button class="btn btn-dark-outline" onclick="window.location.href='/members'">Go back</button>
        `);
    }
}


/////////////////////////
// Authenticated users only
/////////////////////////

//Getting members if user is authenticated
app.use('/members', validateSession);
app.get('/members', (req, res) => {
    username = req.session.loggedUsername;
    randomCatImage = `<img src="basha00${Math.floor(Math.random() * 4) + 1}.JPG" alt="Basha" width="800">`;
    res.render('members', { title: 'Members', catPic: randomCatImage, username: username });
});

// Getting admin if user is authenticated and admin
app.use('/admin', validateSession, validateAdmin);
app.get('/admin', async (req, res) => {
    const result = await usersModel.find();
    res.render('admin', { title: 'Admin Control Panel', users: result });
    // console.log(result);
});

// admin to promot user to admin with user id passed in the request
app.post('/admin/promote', async (req, res) =>{
    userId = req.query.id;
    console.log(userId);
    const result = await usersModel.findOneAndUpdate(
        { _id: userId},
        { $set: { type: 'admin' } }
    );
    console.log("Promoted regular user to admin");
    res.redirect('/admin');
});


// admin to demote user to regular user with user id passed in the request
app.post('/admin/demote', async (req, res) =>{
    const userID = req.query.id;
    console.log(userID);
    const result = await usersModel.findOneAndUpdate(
        { _id: userID},
        { $set: { type: 'regular user' } }
    );
    console.log("Demoted admin to regular user");
    res.redirect('/admin');
});

app.get('/members/admin', (req, res) => {
    res.redirect('/admin');
});

// 404 page
app.use(express.static('public'));
// app.get('/*', '/members/*', (req, res) => {
app.get('/*', (req, res) => {
    res.status(404);
    res.render('404', { title: '404' });
});


//Removed this cause it was causing an error due to duplicate port in server.js
// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`App running on port ${port}.`));
module.exports = app;