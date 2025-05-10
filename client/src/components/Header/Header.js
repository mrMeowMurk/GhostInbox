import React from 'react';
import './Header.css';
import MailboxInfo from '../MailboxInfo/MailboxInfo';

const Header = ({ 
  mailbox, 
  lastUpdate, 
  createMailbox, 
  copyToClipboard, 
  checkEmails, 
  toggleTheme, 
  theme 
}) => {
  return (
    <header className="App-header">
      <div className="header-content">
        <div className="header-left">
          <button className="icon-button create-button" onClick={createMailbox}>
            <span className="icon">✨</span>
          </button>
          <MailboxInfo 
            mailbox={mailbox}
            lastUpdate={lastUpdate}
            copyToClipboard={copyToClipboard}
          />
        </div>
        <div className="header-right">
          <button 
            className="icon-button" 
            onClick={checkEmails} 
            disabled={!mailbox}
            title="Обновить"
          >
            <span className="icon">↻</span>
          </button>
          <button 
            className="icon-button theme-toggle" 
            onClick={toggleTheme}
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
          >
            <span className="icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 