/* global use, db */
// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.


use("comp2537a1");
//db.createCollection("users");

// db.getCollection("users").insertMany([
//     {
//         "username": "Bobz",
//         "password": "Pie",
//         "type": "regular user"
//     },
//     {
//         "username": "Alpha",
//         "password": "Beta",
//         "type": "admin user"
//     },
// ]);

db.getCollection("users").find({});