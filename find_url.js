const https = require('https');

https.get('https://vibe-messenger-client.vercel.app/assets/index-B2eRGBPX.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/https:\/\/[a-zA-Z0-9-]*\.onrender\.com/);
    if (match) {
      console.log('Found backend URL:', match[0]);
    } else {
      console.log('No backend URL found in this chunk.');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
