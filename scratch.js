const bcrypt = require('bcrypt');

const password = 'Beta'

const hashedPassword = bcrypt.hashSync(password, 10);

console.log(hashedPassword);
console.log(bcrypt.compareSync(password, hashedPassword))   