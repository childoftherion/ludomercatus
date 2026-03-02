import React from 'react';

const hintStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  fontSize: '11px',
  color: '#888',
  marginTop: '16px',
  padding: '8px',
  backgroundColor: 'rgba(0,0,0,0.2)',
  borderRadius: '6px',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const keyStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: '4px',
  backgroundColor: '#555',
  color: '#fff',
  fontWeight: 'bold',
  fontFamily: 'monospace',
};

export const ShortcutHints: React.FC = () => {
  return (
    <div style={hintStyle}>
      <span><span style={keyStyle}>Space</span> Roll</span>
      <span><span style={keyStyle}>Enter</span> End Turn</span>
      <span><span style={keyStyle}>B</span> Buy</span>
      <span><span style={keyStyle}>D</span> Decline/Auction</span>
      <span><span style={keyStyle}>E</span> Manage</span>
    </div>
  );
};