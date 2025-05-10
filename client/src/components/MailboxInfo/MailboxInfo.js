import React from 'react';
import './MailboxInfo.css';

const MailboxInfo = ({ mailbox, lastUpdate, copyToClipboard }) => {
  return (
    <div className="mailbox-info">
      <div className="mailbox-main">
        {mailbox ? (
          <div className="mailbox-address-container">
            <span className="mailbox-address">{mailbox}</span>
            <button 
              className="copy-button"
              onClick={copyToClipboard}
              title="Копировать адрес"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 4v12h12V4H8zm11 11H9V5h10v10zm-3-14H4v12h2V3h10V2z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        ) : (
          <span className="mailbox-placeholder">Нажмите ✨ для создания почтового ящика</span>
        )}
        {mailbox && lastUpdate && (
          <div className="update-indicator" title={`Последнее обновление: ${lastUpdate.toLocaleTimeString()}`}>
            <span className="update-dot"></span>
            <span className="update-text">live</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MailboxInfo; 