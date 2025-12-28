import React from 'react'
import './Sidebar.css'

function Sidebar({ isOpen, title, items, onClose }) {
  return (
    <div className={`sidebar ${isOpen ? 'visible' : ''}`}>
      <div className="sidebar-title-area">
        <div className="sidebar-title">{title}</div>
        <div className="sidebar-close" onClick={onClose}>×</div>
      </div>
      <div className="sidebar-content">
        {items.map((item, index) => (
          <div key={index} className="submenu-item">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar




