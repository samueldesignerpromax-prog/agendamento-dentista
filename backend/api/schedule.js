const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'appointments.json');

function readData() {
  const data = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(data);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    const db = readData();
    res.json(db.appointments);
  } else if (req.method === 'POST') {
    const db = readData();
    db.appointments.push(req.body);
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true, appointment: req.body });
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
};
