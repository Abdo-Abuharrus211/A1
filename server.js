const mongoose = require('mongoose');
const app = require('./app');
const dotenv = require('dotenv');
dotenv.config();
// const userModel = require('./models/users');


main().catch(err => console.log(err));
console.log("hello");
async function main() {
    // await mongoose.connect('mongodb://127.0.0.1:27017/comp2537a1');
    // await mongoose.connect(`mongodb+srv://admin-abdo:cJVpswKhU6RtZAoq@cluster0.ozsghtt.mongodb.net/comp2537a1?retryWrites=true&w=majority`);  
    await mongoose.connect(`mongodb+srv://${process.env.ATLAS_DB_USER}:${process.env.ATLAS_DB_PASSWORD}@cluster0.ozsghtt.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`);  
    

    console.log("connected to db");
    app.listen(process.env.PORT || 3000, () => {
      console.log('server is running on port 3000');
    });
  }