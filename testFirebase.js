import fs from 'fs';

const content = fs.readFileSync('src/firebaseConfig.js', 'utf8');
console.log(content);
