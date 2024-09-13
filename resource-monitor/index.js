const express = require('express');
const fs = require('fs');
const os = require('os');
const { format } = require('date-fns');
const cors = require('cors');

const app = express();
const port = 3000; 
const LOG_FILE_PATH = 'resource_logs.txt';
const INTERVAL_MS = 5000; 

let prevCpuUsage = os.cpus();


app.use(cors({
  origin: 'http://localhost:5173' 
}));


function getSystemUsage() {
  const cpuUsage = os.cpus().map((cpu, index) => {
    const prevCpu = prevCpuUsage[index] || cpu;
    const totalDiff = Object.values(cpu.times).reduce((acc, val) => acc + val, 0) - Object.values(prevCpu.times).reduce((acc, val) => acc + val, 0);
    const idleDiff = cpu.times.idle - prevCpu.times.idle;

    return {
      user: cpu.times.user - prevCpu.times.user,
      nice: cpu.times.nice - prevCpu.times.nice,
      sys: cpu.times.sys - prevCpu.times.sys,
      idle: cpu.times.idle - prevCpu.times.idle,
      irq: cpu.times.irq - prevCpu.times.irq,
      usage: totalDiff ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0
    };
  });

  prevCpuUsage = os.cpus(); 

  const memoryUsage = {
    total: os.totalmem(),
    free: os.freemem(),
  };

  const uptime = os.uptime();

  return {
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    cpuUsage,
    memoryUsage,
    uptime,
  };
}


function logResourceUsage() {
  const usage = getSystemUsage();
  const logEntry = `Timestamp: ${usage.timestamp}
CPU Usage: ${JSON.stringify(usage.cpuUsage)}
Memory Usage: Total: ${usage.memoryUsage.total} bytes, Free: ${usage.memoryUsage.free} bytes
Uptime: ${usage.uptime} seconds
---------------------------
`;

  fs.appendFile(LOG_FILE_PATH, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    } else {
      console.log('Logged resource usage at', usage.timestamp);
    }
  });
}


setInterval(logResourceUsage, INTERVAL_MS);


app.get('/api/logs', (req, res) => {
  fs.readFile(LOG_FILE_PATH, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading log file');
    } else {
      res.send(data.split('\n'));
    }
  });
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
