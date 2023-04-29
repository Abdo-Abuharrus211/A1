// Step 1: Create a schema
// Step 2: Create a model
// Step 3: Export the model
const mongoose = require('mongoose');
const usersSchema = new mongoose.Schema({
    username: String,
    password: String,
    type: String,
});

const usersModel = mongoose.model('users', usersSchema);

module.exports = usersModel;