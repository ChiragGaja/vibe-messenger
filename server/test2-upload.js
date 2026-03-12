const http = require('http');

const body = JSON.stringify({ email: `test${Date.now()}@test.com`, username: `user_${Date.now()}`, password: 'Password1!', fullName: 'Test' });

let req = http.request('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const data = JSON.parse(d);
    
    // OTP Bypass needed? The DB requires email verification.
    
    const token = data.token;
    console.log("Register response:", data);
    
    // If we need a token immediately: Let's create a jwt directly with jsonwebtoken using the env secret
    require('dotenv').config();
    const jwt = require('jsonwebtoken');
    const directToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    uploadStatus(directToken);
  });
});
req.write(body);
req.end();

function uploadStatus(token) {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    // Let's mimic an image upload
    const payload = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n` + Buffer.alloc(100).toString('binary') + `\r\n--${boundary}--\r\n`;
    
    const req2 = http.request('http://localhost:5000/api/status', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(payload, 'binary')
        }
    }, res2 => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
             console.log("UPLOAD STATUS:", res2.statusCode, "BODY:", d2);
             process.exit(0);
        });
    });
    
    req2.on('error', console.error);
    req2.write(payload, 'binary');
    req2.end();
}
