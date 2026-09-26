
const fs = require('fs');
const https = require('https');

let TOKEN = process.env.CARDTRADER_TOKEN || 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJjYXJkdHJhZGVyLXByb2R1Y3Rpb24iLCJzdWIiOiJhcHA6OTkwMSIsImF1ZCI6ImFwcDo5OTAxIiwiZXhwIjo0OTQyNDE1NzcyLCJqdGkiOiI2NTM3OTkwNy1iY2RiLTRiZGEtODI2NS02NDExNTcyYzU1OTUiLCJpYXQiOjE3ODY3Mzg1NzIsIm5hbWUiOiJGZ2F2YWduaW4gQXBwIDIwMjQwNDEyMTIxNjExIn0.YcmBv-42ry0rMXzB1ZpqDMfLnSqY4MLcnCJox4jk9DM1-25S-miR_SArKoyIpR0G7Jg4RSfbK0GQKPPLLAOd2n6n34zUZ9qBuXg6yUOKr7vMLCYKh6N7R7e5wtRAvtVKf8V3oj5zeCQ2HfeBfF_fZTgqJzhbN1dCjUA7CRpaWMdHuYe6I1UMfizjLSjVvzWsKVq21i07hzsidfYCvrT8U7pqH2SJzxiumJqUhsYNBkWWItGj9Dec-fC03_LBWI1qfQ5b1lXOA8DXvAERzE06e-eJDS8ywwRWIBGc-VZ-Dhdty6jcG-b3GAGh8P-082ue5tga31RT-tg-aQqcjT9EzA';

function fetchCardTrader(endpointPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cardtrader.com',
      path: endpointPath,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + TOKEN,
        'User-Agent': 'CardVault/1.0'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({status: res.statusCode, data: JSON.parse(data)});
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log(await fetchCardTrader('/api/v2/blueprints/328972'));
}
test();

