const mongoose = require('mongoose');
const app = require('./app');
// const userModel = require('./models/users');


main().catch(err => console.log(err));
console.log("hello");
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/comp2537a1');

    console.log("connected to db");
    app.listen(process.env.PORT || 9000, () => {
      console.log('server is running on port 9000');
    });
  }