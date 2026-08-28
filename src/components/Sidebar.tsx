import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isHovered,
  setIsHovered
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { id: 'simulator', label: 'Batch Simulator', icon: 'fa-laptop-code' },
    { id: 'playground', label: 'Interactive Chat', icon: 'fa-comments', badge: 'Live' },
    { id: 'settings', label: 'Agent Settings', icon: 'fa-sliders' },
  ];

  return (
    <aside 
      className={`sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="brand-wrapper">
        <div className="brand" title="RazorRecovery.AI">
          <div className="brand-icon">
            <img src="/app-icon.png" alt="Razor Recovery AI" className="brand-icon-img" />
          </div>
          <AnimatePresence>
            {isHovered && (
              <motion.div 
                className="brand-name"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <span>Razor</span>Recovery<span className="brand-accent">.AI</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              id={`btn-tab-${item.id}`}
              title={!isHovered ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
            >
              <div className="nav-icon-wrap">
                <i className={`fa-solid ${item.icon}`} />
                {!isHovered && item.badge && <span className="badge-dot" />}
              </div>
              
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    className="nav-item-label"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {isHovered && item.badge && (
                  <motion.span 
                    className="badge"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.18 }}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator-container" title="Webhook Listener Active">
          <span className="status-dot online"></span>
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                style={{ whiteSpace: 'nowrap' }}
              >
                Webhook Listener Active
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="mode-badge" title="Razorpay Test Mode">
          <i className="fa-solid fa-shield-halved"></i>
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                style={{ whiteSpace: 'nowrap' }}
              >
                Razorpay Test Mode
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
};


