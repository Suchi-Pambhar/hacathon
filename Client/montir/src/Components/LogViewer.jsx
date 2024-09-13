import React, { useState, useEffect } from 'react';
import './LogViewer.css'; // Import CSS for styling

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/events'); // Connect to the SSE endpoint

    eventSource.onopen = () => {
      console.log('SSE connection established');
      setLoading(false);
    };

    eventSource.onmessage = (event) => {
      const newLog = JSON.parse(event.data).logEntry;
      setLogs(prevLogs => [newLog, ...prevLogs]); // Prepend new logs
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Error connecting to SSE');
    };

    return () => {
      eventSource.close(); // Clean up SSE connection on unmount
    };
  }, []);

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="log-container">
      <h1>Resource Monitoring Logs</h1>
      {logs.length === 0 ? (
        <p className="no-logs">No logs available</p>
      ) : (
        <ul className="log-list">
          {logs.map((log, index) => (
            <li key={index} className="log-item">
              <pre>{log}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LogViewer;
