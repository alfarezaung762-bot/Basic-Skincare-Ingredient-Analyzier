const fs = require('fs');
let data = fs.readFileSync('src/app/api/analyze/perhitunganlogic/scoringEngine.ts', 'utf8');
data = data.replace(/\\\${/g, '${').replace(/\\`/g, '`');
fs.writeFileSync('src/app/api/analyze/perhitunganlogic/scoringEngine.ts', data);
