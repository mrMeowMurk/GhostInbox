import React from 'react';
import './Footer.css';

const Footer = ({ mailbox, messagesCount, apiUrl }) => {
  return (
    <footer className="App-footer">
      <div className="footer-content">
        <div className="footer-left">
          <p>GhostInbox © {new Date().getFullYear()}</p>
        </div>
        <div className="footer-center">
          <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="api-link">
            <span className="api-icon">⚡</span>
            API
          </a>
        </div>
        <div className="footer-right">
          {mailbox && (
            <div className="footer-stats">
              <span>Писем: {messagesCount}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer; 