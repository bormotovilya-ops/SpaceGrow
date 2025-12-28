import React, { useEffect, useRef } from 'react'
import './MenuItem.css'

function MenuItem({ image, title, onClick, index, total }) {
  const itemRef = useRef(null)

  useEffect(() => {
    const placeItem = () => {
      const container = document.querySelector('.container')
      if (!container || !itemRef.current) return

      const crect = container.getBoundingClientRect()
      const cx = crect.width / 2
      const cy = crect.height / 2
      const radius = Math.min(crect.width, crect.height) * 0.34
      const startAngle = -110
      const angleDeg = startAngle + index * (360 / total)
      const angleRad = angleDeg * Math.PI / 180

      const x = cx + radius * Math.cos(angleRad)
      const y = cy + radius * Math.sin(angleRad)

      itemRef.current.style.left = `${x}px`
      itemRef.current.style.top = `${y}px`
    }

    placeItem()
    window.addEventListener('resize', placeItem)
    return () => window.removeEventListener('resize', placeItem)
  }, [index, total])

  return (
    <div 
      ref={itemRef}
      className="menu-item" 
      onClick={onClick}
    >
      <img src={image} alt={title || 'menu item'} />
      {title && <span>{title}</span>}
    </div>
  )
}

export default MenuItem




