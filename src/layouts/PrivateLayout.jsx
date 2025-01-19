import React, { useEffect, Suspense, useContext } from 'react';
import { Route, Routes } from 'react-router-dom';

import { PrivateRouter } from '../routers/private.router';
import styles from './styles/PrivateLayout.module.scss';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { PathURLContext } from '../context';

const PrivateLayout = () => {
  const fullPath = window.location.pathname;
  const path = window.location.pathname.split('/')[2];
  const IsCommitteeIdSelected = localStorage.getItem('selectedCommitteeID');

  const { setPath } = useContext(PathURLContext);

  const AppBarWrapper = ({ Component, routerName }) => {
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setPath(path);
    }, [routerName]);

    return (
      <div className={styles.layoutContainer}>
        <div className={styles.backgroundImage}>
          <Navbar />
          <div className={styles.layoutContent}>
            <main className={styles.appBarWrapper}>
              <Suspense>
                <Component />
              </Suspense>
            </main>

            {fullPath.includes('admin') ? (
              <Sidebar isAdminSidebar={true} />
            ) : IsCommitteeIdSelected == null ? (
              <></>
            ) : (
              <Sidebar isAdminSidebar={false} />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Routes>
      {PrivateRouter?.map((router, index) => (
        <Route
          key={`${index}-${router.name}`}
          path={router.path}
          element={<AppBarWrapper Component={router.component} routerName={router.name} />}
        />
      ))}
    </Routes>
  );
};

export default PrivateLayout;
