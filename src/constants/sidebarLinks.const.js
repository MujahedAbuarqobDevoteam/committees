import {
  FaTachometerAlt,
  FaEnvelope,
  FaUsers,
  FaTasks,
  FaCalendarAlt,
  FaPen,
  FaHistory,
  FaFileAlt,
  FaBell,
  FaUserShield,
} from 'react-icons/fa';

export const SidebarLinks = (navigate, setActiveLink, styles) => [
  {
    id: 0,
    text: 'مدير النظام',
    icon: <FaUserShield />,
    onClick: () => {
      navigate('/admin/locations');
      setActiveLink(0);
    },
  },
  {
    id: 1,
    text: 'نظرة عامة',
    icon: <FaTachometerAlt className={styles.icon} />,
    onClick: () => {
      navigate('/');
      setActiveLink(1);
    },
  },
  {
    id: 2,
    text: 'صندوق الرسائل',
    icon: <FaEnvelope className={styles.icon} />,
    onClick: () => {
      navigate('/inbox');
      setActiveLink(2);
    },
  },
  {
    id: 3,
    text: 'الأشخاص',
    icon: <FaUsers className={styles.icon} />,
    onClick: () => {
      navigate('/users');
      setActiveLink(3);
    },
  },
  {
    id: 4,
    text: 'مهام اللجنة',
    icon: <FaTasks className={styles.icon} />,
    onClick: () => {
      navigate('/committee-tasks');
      setActiveLink(4);
    },
  },
  {
    id: 5,
    text: 'الاجتماعات',
    icon: <FaCalendarAlt className={styles.icon} />,
    onClick: () => {
      navigate('/meetings');
      setActiveLink(5);
    },
  },
  {
    id: 6,
    text: 'المهام',
    icon: <FaPen className={styles.icon} />,
    onClick: () => {
      navigate('/tasks');
      setActiveLink(6);
    },
  },
  {
    id: 7,
    text: 'سجل النشاطات',
    icon: <FaHistory className={styles.icon} />,
    onClick: () => {
      navigate('/activity-log');
      setActiveLink(7);
    },
  },
  // {
  //   id: 8,
  //   text: 'المشاريع المرتبطة',
  //   icon: <FaProjectDiagram className={styles.icon} />,
  //   onClick: () => {
  //     navigate('/related-projects');
  //     setActiveLink(8);
  //   },
  // },
  {
    id: 9,
    text: 'الوثائق المرتبطة',
    icon: <FaFileAlt className={styles.icon} />,
    onClick: () => {
      navigate('/related-documents');
      setActiveLink(9);
    },
  },
  {
    id: 10,
    text: 'الاخبار والاشعارات',
    icon: <FaBell className={styles.icon} />,
    onClick: () => {
      navigate('/news');
      setActiveLink(10);
    },
  },
];
