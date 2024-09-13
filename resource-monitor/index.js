const express = require('express');
const fs = require('fs');
const os = require('os');
const { format } = require('date-fns');
const cors = require('cors');
const si = require('systeminformation'); // Using systeminformation library

const app = express();
const port = 3000; 
const LOG_FILE_PATH = 'resource_logs.txt';
const INTERVAL_MS = 5000;

let prevCpuUsage = os.cpus(); 

app.use(cors({
  origin: 'http://localhost:5173'
}));

// Function to get system CPU and memory usage
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
      usage: totalDiff ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0 // Percentage of CPU usage
    };
  });

  prevCpuUsage = os.cpus(); 

  const memoryUsage = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem(), // Used memory
    percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100 // Memory usage in percentage
  };

  const uptime = os.uptime(); // System uptime

  return {
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    cpuUsage,
    memoryUsage,
    uptime,
  };
}

// Async function to fetch GPU usage
async function getGpuUsage() {
  try {
    const gpuData = await si.graphics(); // Fetch GPU data using systeminformation
    const gpuUsage = gpuData.controllers.map(gpu => ({
      name: gpu.model,
      load: gpu.active ? gpu.memoryFree / (gpu.memoryTotal || 1) * 100 : 0, // GPU memory usage in percentage
      memoryUsage: gpu.memoryUsed / (gpu.memoryTotal || 1) * 100 // Memory usage in percentage
    }));
    return gpuUsage;
  } catch (error) {
    console.error('Error fetching GPU usage:', error);
    return [];
  }
}

// Function to log system resource usage and send updates to clients
async function logResourceUsage() {
  const systemUsage = getSystemUsage();
  const gpuUsage = await getGpuUsage();
  
  const logEntry = `Timestamp: ${systemUsage.timestamp}
CPU Usage: ${JSON.stringify(systemUsage.cpuUsage)}
Memory Usage: Total: ${systemUsage.memoryUsage.total} bytes, Free: ${systemUsage.memoryUsage.free} bytes, Used: ${systemUsage.memoryUsage.used} bytes, Percentage: ${systemUsage.memoryUsage.percentage.toFixed(2)}%
Uptime: ${systemUsage.uptime} seconds
GPU Usage: ${JSON.stringify(gpuUsage)}
---------------------------
`;

  fs.appendFile(LOG_FILE_PATH, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    } else {
      console.log('Logged resource usage at', systemUsage.timestamp);
    }
  });

  // Send the log entry to SSE clients
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ logEntry })}\n\n`);
  });
}

// Store SSE clients
const sseClients = [];

// Endpoint to provide SSE updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add client to the list
  sseClients.push(res);

  // Remove client from the list when connection is closed
  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index >= 0) {
      sseClients.splice(index, 1);
    }
  });
});

// Run resource logging at a defined interval
setInterval(logResourceUsage, INTERVAL_MS);

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
