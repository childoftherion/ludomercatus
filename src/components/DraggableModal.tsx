import React, { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue } from 'framer-motion'

interface DraggableModalProps {
  children: React.ReactNode
  initialX?: number
  initialY?: number
  autoHideDelay?: number // Auto-hide after inactivity (ms), 0 to disable
  minWidth?: number
  minHeight?: number
  style?: React.CSSProperties
  minimizedTitle?: string // Title to show when minimized (e.g., player name)
  allowClose?: boolean // Allow closing the modal (default: true)
  forceVisible?: boolean // Force modal to always be visible (default: false)
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
  children,
  initialX = 0,
  initialY = 0,
  autoHideDelay = 5000, // 5 seconds default
  minWidth = 300,
  minHeight = 200,
  style = {},
  minimizedTitle,
  allowClose = true,
  forceVisible = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // If forceVisible is true, always keep it visible
  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true)
    }
  }, [forceVisible])
  const [isDragging, setIsDragging] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract positioning from style - remove top/left/transform as we use x/y
  const { top, left, transform, ...restStyle } = style
  const shouldCenter = top === '50%' || left === '50%'

  // Start with initial position, will be updated if centering is needed
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const x = useMotionValue(initialX)
  const y = useMotionValue(initialY)

  // Calculate centered position after mount
  useEffect(() => {
    if (shouldCenter) {
      // Use setTimeout to ensure window is available
      const timer = setTimeout(() => {
        // Center relative to viewport
        const centerX = window.innerWidth / 2 - minWidth / 2
        const centerY = window.innerHeight / 2 - minHeight / 2
        setPosition({ x: centerX, y: centerY })
        x.set(centerX)
        y.set(centerY)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [shouldCenter, minWidth, minHeight, x, y])

  // Auto-hide functionality
  useEffect(() => {
    if (autoHideDelay === 0 || forceVisible) return

    const checkActivity = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity > autoHideDelay && !isDragging && !isMinimized) {
        setIsVisible(false)
      }
    }

    const interval = setInterval(checkActivity, 1000)
    return () => clearInterval(interval)
  }, [autoHideDelay, isDragging, isMinimized])

  // Update activity timestamp on mouse movement
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (!isVisible) {
        setIsVisible(true)
      }
    }

    if (autoHideDelay > 0) {
      window.addEventListener('mousemove', handleActivity)
      window.addEventListener('click', handleActivity)
      return () => {
        window.removeEventListener('mousemove', handleActivity)
        window.removeEventListener('click', handleActivity)
      }
    }
  }, [autoHideDelay, isVisible])

  const handleDragStart = () => {
    setIsDragging(true)
    lastActivityRef.current = Date.now()
    setIsVisible(true)
  }

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false)
    const currentX = x.get()
    const currentY = y.get()
    const newX = currentX + info.delta.x
    const newY = currentY + info.delta.y
    setPosition({ x: newX, y: newY })
    x.set(newX)
    y.set(newY)
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
    lastActivityRef.current = Date.now()
  }

  const handleClose = () => {
    if (!forceVisible) {
      setIsVisible(false)
    }
  }

  if (!forceVisible && !isVisible && !isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          zIndex: 150,
          cursor: 'pointer',
        }}
        onClick={() => setIsVisible(true)}
        whileHover={{ scale: 1.1 }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '8px 16px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          Click to show
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragConstraints={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        x,
        y,
        zIndex: restStyle.zIndex !== undefined ? restStyle.zIndex : 200,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: forceVisible ? 1 : isVisible ? 1 : 0.3,
        ...restStyle,
      }}
      whileHover={{ scale: isMinimized ? 1 : 1.02 }}
      animate={{
        scale: isMinimized ? 0.3 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <div
        style={{
          backgroundColor:
            restStyle.backgroundColor !== undefined
              ? restStyle.backgroundColor
              : 'rgba(0, 0, 0, 0.95)',
          borderRadius:
            restStyle.borderRadius !== undefined
              ? restStyle.borderRadius
              : '16px',
          boxShadow:
            restStyle.boxShadow !== undefined
              ? restStyle.boxShadow
              : '0 8px 32px rgba(0, 0, 0, 0.5)',
          border:
            restStyle.border !== undefined
              ? restStyle.border
              : '1px solid rgba(255,255,255,0.1)',
          minWidth: isMinimized
            ? minimizedTitle
              ? '120px'
              : '80px'
            : minWidth,
          minHeight: isMinimized ? 'auto' : minHeight,
          overflow: isMinimized ? 'hidden' : 'visible',
          position: 'relative',
        }}
      >
        {/* Header with controls */}
        <div
          className="draggable-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: 'grab',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              userSelect: 'none',
            }}
          >
            Drag to move
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleMinimize}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              {isMinimized ? '□' : '−'}
            </motion.button>
            {allowClose && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                style={{
                  background: 'rgba(255,0,0,0.3)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Hide"
              >
                ×
              </motion.button>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            display: isMinimized ? 'none' : 'block',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  )
}
