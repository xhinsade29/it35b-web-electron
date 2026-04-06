import { NavLink, useLocation } from 'react-router-dom';
import styles from '../assets/styles/Sidebar.module.css';
import { monitorNavItems, adminNavItems, type NavItem } from './navData';
import logo from '/logo.png';

// Type for user data
interface User {
  user_id: string;
  full_name: string;
  role: string;
}

interface SidebarProps {
  user?: User;
  onLogout?: () => void;
}

// Nav Item Component
function NavItemLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  
  return (
    <NavLink
      to={item.path}
      className={`${styles.navItem} ${isActive ? styles.active : ''}`}
      aria-current={isActive ? 'page' : 'false'}
    >
      <div className={styles.navIcon} aria-hidden="true">
        <Icon />
      </div>
      <div className={styles.navLabelWrap}>
        <div className={styles.navLabel}>{item.label}</div>
        <div className={styles.navSublabel}>{item.sublabel}</div>
      </div>
      {item.badge && (
        <span className={styles.badge}>{item.badge}</span>
      )}
    </NavLink>
  );
}

// Main Sidebar Component
export function Sidebar({ user, onLogout }: SidebarProps) {
  const location = useLocation();
  
  // Get first letter of user's name for avatar
  const avatarLetter = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
  const displayName = user?.full_name || 'User';
  const roleDisplay = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
  
  // Determine if a nav item is active based on current path
  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
      onLogout?.();
    }
  };

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      {/* Logo Area */}
      <div className={styles.logoArea}>
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}>
            <img 
              src={logo} 
              alt="Aqua-Vision logo"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Aqua-Vision</span>
            <span className={styles.logoSub}>River Monitor</span>
          </div>
        </div>

        <div className={styles.statusPill} role="status" aria-live="polite">
          <div className={styles.statusDot}></div>
          <span className={styles.statusLabel}>All Systems Active</span>
        </div>
      </div>

      {/* Monitor Section */}
      <div className={styles.navSection}>
        <div className={styles.sectionLabel} aria-hidden="true">Monitor</div>
        
        {monitorNavItems.slice(0, 3).map((item) => (
          <NavItemLink 
            key={item.id} 
            item={item} 
            isActive={isActivePath(item.path)}
          />
        ))}

        <div className={styles.navDivider} role="separator"></div>

        <div className={styles.sectionLabel} aria-hidden="true">Infrastructure</div>
        
        {monitorNavItems.slice(3).map((item) => (
          <NavItemLink 
            key={item.id} 
            item={item} 
            isActive={isActivePath(item.path)}
          />
        ))}
      </div>

      {/* Admin Section */}
      <div className={styles.adminSection}>
        <div className={styles.adminLabel} aria-hidden="true">Admin</div>
        
        {adminNavItems.map((item) => (
          <NavItemLink 
            key={item.id} 
            item={item} 
            isActive={isActivePath(item.path)}
          />
        ))}
      </div>

      {/* User Footer */}
      <div className={styles.userFooter}>
        <a 
          href="#" 
          className={styles.userCard} 
          onClick={handleLogout}
          role="button"
          tabIndex={0}
          aria-label="Logout"
        >
          <div className={styles.avatar} aria-hidden="true">
            {avatarLetter}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userRole}>{roleDisplay} • Click to logout</div>
          </div>
          <div className={styles.userMenuBtn} aria-hidden="true">
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        </a>
      </div>
    </nav>
  );
}

export default Sidebar;
