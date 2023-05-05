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
    // res.send(
    //     `
    //     <h1>Welcome to Cat Cookies 101, let's begin.</h1>
    //     <button type="button" onclick="location.href='/signup'">Sign Up</button>
    //     <button type="button" onclick="location.href='/login'">Login</button>
    //     `
    // );
}
);

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

//User Login page
app.get('/login', (req, res) => {
    const errorMessage = req.query.error;
    res.send(
        `
        <h3>Login:</h3>
        <form action="/login" method="post">
        <input type="email" name="email" placeholder="Enter your email" />
        <br>
        <input type="password" name="password" placeholder="Enter your password" />
        <br>
        <input type="submit" value="Login"/>
        </form>
        ${errorMessage ? `<p>${errorMessage}</p>` : ''}
        `)
});


// User Signup page
app.get('/signup', (req, res) => {
    const errorMessage = req.query.error;
    res.send(
        `
        <h3>Sign Up:</h3>
        <form action="/signup" method="post">
        <input type="text" name="username" placeholder="Enter your username" />
        <br>
        <input type="email" name="email" placeholder="Enter your email" />
        <br>
        <input type="password" name="password" placeholder="Enter your password" />
        <br>
        <input type="submit" value="Signup" />
        </form>
        ${errorMessage ? `<p>${errorMessage}</p>` : ''}
        `);
});

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
        res.render('/members');
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
            email: req.body.email,
            password: req.body.password,
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

// give me a function that checks if the user is an admin
function isAdmin(req) {
    if (req.session.loggedUsername === 'admin') {
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
        res.send(`<h1> You are not an admin, ${req.session.loggedUsername}`);
    }
}




/////////////////////////
// Authenticated users only
/////////////////////////



///// New EJS routes


//Getting members if user is authenticated
app.use('/members', validateSession);
app.get('/members', (req, res) => {
    randomCatImage = `<img src="basha00${Math.floor(Math.random() * 4) + 1}.JPG" alt="Basha" width="800">`;
    res.render('members', { title: 'Members' , catPic: randomCatImage});});


    app.get('/admin', async(req, res) => {
        const result = await usersModel.find().project({ username: 1, type: 1, _id: 1 }).toArray();
        res.render('admin', { title: 'Admin Control Panel', users: result });
    });
    














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
             <img src="basha00${Math.floor(Math.random() * 4) + 1}.JPG" alt="Basha" width="800">
             <br>
            <form action="/logout" method="post">
            <input type="submit" value="Logout" />
            </form>`);
});

// 
//check if user is an Administator
// const authenticatedAdminOnly = async (req, res, next) => {
//     // add try catch to handle errors
//     try {
//         const result = await usersModel.findOne({ username: req.session.loggedUsername }
//         )
//         if (result?.type != 'admin user') {
//             console.log("You are not an Admin, Harry!");
//             return res.send(`<h1> You are not and admin, ${result.username}`); //if not admin, return error
//         }
//         next(); //allow next route to run
//     } catch (error) {
//         console.log(error);

//     };
// };

// app.use(authenticatedAdminOnly);
// app.get('/authenticatedAdminsOnly', authenticatedAdminOnly, (req, res) => {
//     console.log("You are an Admin, Harry!");
//     res.send(`<h1>You are an Administrator!</h1>`);
// });
app.use(express.static('public'));
app.get('/*', (req, res) => {
    res.status(404).send(
        `
        <h2>Page not found - 404</h2>
        <img src="cat404.gif" alt="404 cat gif" width="800">
        <a href="/">Go back</a>
        `
    );
});



// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`App running on port ${port}.`));
module.exports = app;