import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentLog } from '../types';

interface LogTerminalProps {
  logs: AgentLog[];
  clearLogs: () => void;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, clearLogs }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  return (
    <footer className={`audit-terminal-section ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div 
        className="terminal-header" 
        onClick={() => setIsOpen(prev => !prev)}
        style={{ cursor: 'pointer' }}
        title={isOpen ? "Click to collapse terminal logs" : "Click to view live agent logs"}
      >
        <div className="terminal-title">
          <i className="fa-solid fa-terminal" />
          <span>RazorRecovery Autonomous Agent Live Log Terminal</span>
          <span className="terminal-counter-tag">({logs.length} logs)</span>
        </div>
        <div className="terminal-actions" onClick={(e) => e.stopPropagation()}>
          <span className="terminal-badge" id="terminal-badge">
            <span className="status-dot online blinking" /> Listening...
          </span>
          <button 
            className="terminal-clear-btn" 
            onClick={clearLogs} 
            id="btn-clear-terminal"
            title="Clear log buffer"
          >
            <i className="fa-solid fa-trash-can" /> Clear
          </button>
          <div 
            className="terminal-chevron-indicator"
            onClick={() => setIsOpen(prev => !prev)}
            title={isOpen ? "Collapse logs" : "Expand logs"}
          >
            <i className={`fa-solid ${isOpen ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="terminal-body" 
            id="terminal-output"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 170, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
                className={`log-line ${log.type}`}
              >
                <span className="log-time">[{log.timestamp}]</span>
                {' '}
                <span className="log-source">[{log.source}]</span>
                {' '}
                {log.message}
              </motion.div>
            ))}
            <div ref={terminalEndRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
};


