const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');

app.use(cors());
app.use(express.static('./'));


/*   ###################################    */
// https://developer.spotify.com/dashboard/
const client_id = '#######';
const redirec_url = 'http://localhost:3535';
/*   ###################################    */
/*   ###################################    */


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/main.html'));
});

app.get('/request_auth', (req, res) => {
    res.redirect(`https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirec_url}&scope=user-read-currently-playing`);
});

app.listen(3535);
console.log('Listening... <>');
