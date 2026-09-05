import React, { useState, useRef, useEffect } from 'react';
import type { AuthUser } from '../types';

interface UserProfileMenuProps {
  user: AuthUser;
  onLogout: () => void;
  onLockSession?: () => void;
  onSwitchPersona?: (role: 'admin' | 'finance' | 'operator') => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  onLogout,
  onLockSession,
  onSwitchPersona
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeClass = (role: string) => {
    if (role.toLowerCase().includes('admin')) return 'badge-admin';
    if (role.toLowerCase().includes('finance')) return 'badge-finance';
    return 'badge-operator';
  };

  const getRoleIcon = (role: string) => {
    if (role.toLowerCase().includes('admin')) return 'fa-shield-halved';
    if (role.toLowerCase().includes('finance')) return 'fa-coins';
    return 'fa-headset';
  };

  return (
    <div className="user-profile-menu-container" ref={dropdownRef}>
      <button
        className="user-profile-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        id="user-profile-btn"
      >
        <div className="user-avatar-badge">
          <i className={`fa-solid ${getRoleIcon(user.role)}`} />
        </div>

        <div className="user-text-meta">
          <span className="user-display-name">{user.name}</span>
          <span className={`user-role-pill ${getRoleBadgeClass(user.role)}`}>
            {user.role}
          </span>
        </div>

        <i className={`fa-solid fa-chevron-down caret-icon ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-profile-dropdown">
          <div className="dropdown-user-header">
            <div className="header-avatar-large">
              <i className={`fa-solid ${getRoleIcon(user.role)}`} />
            </div>
            <div className="header-user-details">
              <h4>{user.name}</h4>
              <span className="user-email-text">{user.email}</span>
              <div className="security-status-row">
                <span className="status-live-dot" />
                <span className="sec-label">256-Bit Encrypted Session</span>
              </div>
            </div>
          </div>

          <div className="dropdown-divider" />

          <div className="dropdown-section-title">
            <i className="fa-solid fa-layer-group" /> Switch Demo Role
          </div>

          <div className="role-switch-list">
            <button
              className={`role-switch-item ${user.role.includes('Admin') ? 'active-role' : ''}`}
              onClick={() => {
                onSwitchPersona?.('admin');
                setIsOpen(false);
              }}
            >
              <div className="role-item-icon admin-bg"><i className="fa-solid fa-shield-halved" /></div>
              <div className="role-item-info">
                <strong>Admin (Aarav Mehta)</strong>
                <span>Full access to recovery rules & configs</span>
              </div>
              {user.role.includes('Admin') && <i className="fa-solid fa-check check-current" />}
            </button>

            <button
              className={`role-switch-item ${user.role.includes('Finance') ? 'active-role' : ''}`}
              onClick={() => {
                onSwitchPersona?.('finance');
                setIsOpen(false);
              }}
            >
              <div className="role-item-icon finance-bg"><i className="fa-solid fa-coins" /></div>
              <div className="role-item-info">
                <strong>Finance Lead (Priya Nambiar)</strong>
                <span>Disputes, settlements & discount caps</span>
              </div>
              {user.role.includes('Finance') && <i className="fa-solid fa-check check-current" />}
            </button>

            <button
              className={`role-switch-item ${user.role.includes('Support') || user.role.includes('Operator') ? 'active-role' : ''}`}
              onClick={() => {
                onSwitchPersona?.('operator');
                setIsOpen(false);
              }}
            >
              <div className="role-item-icon ops-bg"><i className="fa-solid fa-headset" /></div>
              <div className="role-item-info">
                <strong>Support Agent (Rohan Deshmukh)</strong>
                <span>Conversational WhatsApp nudges</span>
              </div>
              {(user.role.includes('Support') || user.role.includes('Operator')) && <i className="fa-solid fa-check check-current" />}
            </button>
          </div>

          <div className="dropdown-divider" />

          <div className="dropdown-footer-actions">
            {onLockSession && (
              <button
                className="dropdown-action-btn lock-btn"
                onClick={() => {
                  onLockSession();
                  setIsOpen(false);
                }}
              >
                <i className="fa-solid fa-lock" /> Lock Terminal
              </button>
            )}

            <button
              className="dropdown-action-btn logout-btn"
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              id="logout-btn"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" /> Terminate Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
