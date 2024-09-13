import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LogViewer.css'; // Import CSS for styling

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/logs');
        setLogs(response.data);
      } catch (err) {
        setError('Error fetching logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
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