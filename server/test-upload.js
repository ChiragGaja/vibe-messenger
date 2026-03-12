const http = require('http');

const req = http.request('http://localhost:5000/api/status', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=---12345' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});
req.on('error', console.error);
req.end('-----12345\r\nContent-Disposition: form-data; name="media"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nHello\r\n-----12345--\r\n');
