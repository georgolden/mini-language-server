import React, { useEffect, useRef, useState } from 'react';

// Custom JSON Viewer component
const JSONViewer = ({ data, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const indent = '  '.repeat(level);

  if (typeof data !== 'object' || data === null) {
    return (
      <span
        className={`
        ${typeof data === 'string' ? 'text-green-600 dark:text-green-400' : ''}
        ${typeof data === 'number' ? 'text-blue-600 dark:text-blue-400' : ''}
        ${typeof data === 'boolean' ? 'text-purple-600 dark:text-purple-400' : ''}
        ${data === null ? 'text-gray-600 dark:text-gray-400' : ''}
      `}
      >
        {JSON.stringify(data)}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return <span>{isArray ? '[]' : '{}'}</span>;
  }

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="font-mono relative" style={{ paddingLeft: level > 0 ? '1.5rem' : '0' }}>
      <span onClick={toggleExpand} className="cursor-pointer hover:text-blue-500 select-none">
        {isExpanded ? '▼' : '▶'} {isArray ? '[' : '{'}
      </span>

      {isExpanded && (
        <div className="ml-4">
          {Object.entries(data).map(([key, value], index) => (
            <div key={key} className="whitespace-nowrap">
              <span className="text-gray-600 dark:text-gray-400">
                {isArray ? '' : `"${key}": `}
              </span>
              <JSONViewer data={value} level={level + 1} />
              {index < Object.keys(data).length - 1 && <span>,</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ paddingLeft: isExpanded ? '0.5rem' : '0' }}>{isArray ? ']' : '}'}</div>
    </div>
  );
};

const KawaiiLogger = () => {
  const [logs, setLogs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectTime, setReconnectTime] = useState(null);
  const wsRef = useRef<WebSocket | null>(null);
  const logsContainerRef = useRef(null);

  const connect = () => {
    const ws = new WebSocket('ws://localhost:3001/logs');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      setReconnectTime(null);
    };

    ws.onmessage = (event) => {
      const logData = JSON.parse(event.data);
      setLogs((prevLogs) => [...prevLogs, logData]);

      // Auto-scroll to bottom
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      // Reconnect logic with exponential backoff
      const delay = Math.min((reconnectTime || 1000) * 1.5, 5000);
      setReconnectTime(delay);
      setTimeout(connect, delay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== WebSocket.OPEN) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wsRef.current?.close();
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-5">
      <div
        className={`
        inline-block px-4 py-2 rounded-2xl text-sm font-bold mb-5
        ${connectionStatus === 'connected' ? 'bg-green-200' : 'bg-red-200'}
      `}
      >
        {connectionStatus === 'connected'
          ? 'Connected! (๑>ᴗ<๑)✧'
          : `Disconnected (´；ω；｀) ${reconnectTime ? `Reconnecting in ${reconnectTime / 1000}s...` : 'nya~'}`}
      </div>

      <div
        ref={logsContainerRef}
        className="bg-white dark:bg-gray-800 border-2 border-dashed border-pink-300 
                 dark:border-purple-400 p-4 rounded-2xl h-[70vh] overflow-auto mb-5 
                 text-base leading-relaxed shadow-lg"
      >
        {logs.length === 0 ? (
          <div className="italic opacity-70">UwU... no logs yet, nya~ (´｡• ᵕ •｡`)</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`
                p-3 my-2 rounded-xl shadow
                ${log.level === 'debug' && 'bg-blue-100 dark:bg-blue-800'}
                ${log.level === 'info' && 'bg-green-100 dark:bg-green-800'}
                ${log.level === 'warn' && 'bg-yellow-100 dark:bg-yellow-800'}
                ${log.level === 'error' && 'bg-red-100 dark:bg-red-800'}
              `}
            >
              <div className="flex gap-4 mb-2">
                <span className="font-mono">[{log.timestamp}]</span>
                <span className="font-bold">{log.level.toUpperCase()}:</span>
              </div>
              <div className="pl-4">
                <JSONViewer
                  data={typeof log.message === 'object' ? log.message : { message: log.message }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={clearLogs}
        className="bg-pink-300 dark:bg-purple-500 text-white px-6 py-3 
                 rounded-full text-sm font-bold shadow-lg hover:scale-110 
                 transition-transform duration-200 focus:outline-none"
      >
        {'Clear logs ✧(>ω<)✧'}
      </button>
    </div>
  );
};

export default KawaiiLogger;
