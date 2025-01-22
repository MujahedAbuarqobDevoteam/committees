import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// import { FaCog } from 'react-icons/fa';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
// import LoginIcon from '@mui/icons-material/Login';
// import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { FaSignOutAlt } from 'react-icons/fa';

import { ActiveLinkContext } from '../context';
import { SidebarLinks } from '../constants';

import styles from './styles/Navbar.module.scss';
import useScreenSize from '../hooks/useScreenSize';
// import IconButton from '@mui/material/IconButton';
import DevoteamLogo from '../components/assets/devoteam.png';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isSmall } = useScreenSize();
  const { setActiveLink } = useContext(ActiveLinkContext);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const onLogoClick = () => {
    navigate('/');
    setActiveLink(null);
  };

  const handleMenuClick = () => {
    setIsMenuOpen(prev => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const links = SidebarLinks(navigate, setActiveLink, styles);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo} onClick={onLogoClick}>
        {/* <FaCog className={styles.logoIcon} /> */}
        <img src={DevoteamLogo} alt='Devoteam Logo' className={styles.logoIcon} />
        <span>نظام إدارة اللجان</span>
      </div>
      <div className={styles.buttons}>
        {/* <IconButton className={styles.iconButton}>
          <LoginIcon fontSize='large' />
        </IconButton> */}

        {/* <button className={styles.logoutButton} onClick={handleLogout}>
          تسجيل الخروج
        </button> */}

        <p className={styles.welcomeMsg}>مرحباً, فادي</p>
        <FaSignOutAlt className={styles.logoutIcon} onClick={handleLogout} />

        {isSmall && <MenuIcon fontSize='large' onClick={handleMenuClick} className={styles.menuIcon} />}

        {isSmall && (
          <div className={`${styles.modal} ${isMenuOpen ? styles.open : styles.closed}`}>
            <div className={styles.modalHeader}>
              <CloseIcon fontSize='large' onClick={handleMenuClick} className={styles.closeIcon} />
            </div>
            <ul className={styles.menuList}>
              {links?.map(link => (
                <li
                  key={link?.id}
                  className={styles.menuItem}
                  onClick={() => {
                    link.onClick();
                    setIsMenuOpen(false);
                  }}>
                  <span>{link?.text}</span>
                  {link?.icon}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
