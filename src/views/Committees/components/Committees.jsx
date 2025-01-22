import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaTasks, FaUser } from 'react-icons/fa';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { Modal } from '@mui/material';

import styles from './Committees.module.scss';
import OverviewFilters from './OverviewFilters';
import { CommitteesStatus, ENC, ToastMessage } from '../../../constants';
import { CommitteeServices } from '../services/committees.service';
import apiService from '../../../services/axiosApi.service';
import { useToast } from '../../../context';
import { encryptData, decryptData } from '../../../utils/Encryption.util';

const Committees = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [committees, setCommittees] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCommitteeID, setSelectedCommitteeID] = useState(null);
  const [filteredCommittees, setFilteredCommittees] = useState([]);

  useEffect(() => {
    localStorage.removeItem('selectedCommitteeID');
    localStorage.removeItem('selectedCommitteeName');
  }, []);

  const fetchCommittees = useCallback(async () => {
    try {
      const data = await apiService.getById('GetCommitteeByUserId', 6); // UPDATE HERE
      setCommittees(data);
      setFilteredCommittees(data);
    } catch (error) {
      console.error('Error fetching committees:', error);
    }
  }, []);

  useEffect(() => {
    fetchCommittees();
  }, [fetchCommittees]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();

      const updatedTimeRemaining = committees?.reduce((acc, committee) => {
        if (!committee.NextMeetingDate || !committee.NextMeetingStartTime) {
          acc[committee.ID] = 'Invalid';
          return acc;
        }

        const cleanDate = committee.NextMeetingDate.split('T')[0];
        const nextMeetingTime = new Date(`${cleanDate}T${committee.NextMeetingStartTime}`);
        const distance = nextMeetingTime.getTime() - now;

        if (distance <= 0) {
          acc[committee.ID] = 'Expired';
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          acc[committee.ID] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        return acc;
      }, {});

      setTimeRemaining(updatedTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [committees?.map(committee => committee.NextMeetingDate), committees?.map(committee => committee.NextMeetingStartTime)]);

  const applyFilters = (status, category) => {
    let filtered = committees;

    if (status !== '') {
      const isActive = status === 'activated';
      filtered = filtered.filter(committee => committee.IsActive === isActive);
    }

    if (category !== '') {
      filtered = filtered.filter(committee => committee.CategoryID === parseInt(category));
    }

    setFilteredCommittees(filtered);
  };

  const committeeStatusLabel = status => {
    switch (status) {
      case true:
        return {
          label: CommitteesStatus?.ACTIVE,
          style: styles.statusActive,
        };
      case false:
        return {
          label: CommitteesStatus?.DEACTIVATED,
          style: styles.statusDeactivated,
        };
      default:
        return {
          label: '',
          style: '',
        };
    }
  };

  const handleCardClick = (id, name) => {
    const encCommitteeID = encryptData(String(id), ENC);
    const encCommitteeName = encryptData(name, ENC);
    const encUserID = encryptData(String(6), ENC);

    // localStorage.setItem('selectedCommitteeID', encCommitteeID);
    // localStorage.setItem('selectedCommitteeName', encCommitteeName);
    // localStorage.setItem('userID', encUserID);

    localStorage.setItem('selectedCommitteeID', id);
    localStorage.setItem('selectedCommitteeName', name);
    localStorage.setItem('userID', 6); // UPDATE HERE
    navigate(`/committee/${id}`);
  };

  const toggleDropdown = id => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleOptionClick = async (status, committee) => {
    try {
      const updatedCommittee = {
        ...committee,
        IsActive: status === CommitteesStatus.ACTIVE ? false : true,
      };

      await apiService.update('UpdateCommittee', {
        ID: committee?.ID,
        IsActive: updatedCommittee.IsActive,
        Number: committee?.Number,
        ArabicName: committee?.ArabicName,
        EnglishName: committee?.EnglishName,
        DepID: committee?.DepID,
        MeetingTemplateName: committee?.MeetingTemplateName,
        ShortName: committee?.ShortName,
        TypeID: committee?.TypeID,
        CategoryID: committee?.CategoryID,
      });

      setFilteredCommittees(prevCommittees => prevCommittees.map(c => (c.ID === committee.ID ? updatedCommittee : c)));

      showToast(ToastMessage?.CommitteeActivationChangeSuccess, 'success');
    } catch (e) {
      console.error('Error updating committee status:', e);
      showToast(ToastMessage?.SomethingWentWrong, 'error');
    } finally {
      setActiveDropdown(null);
    }
  };

  const toggleDeleteModal = id => {
    setSelectedCommitteeID(id);
    setIsDeleteModalOpen(!isDeleteModalOpen);
  };

  const handleCommitteeDeletion = async () => {
    try {
      await CommitteeServices.delete(selectedCommitteeID);
      setCommittees(prevCommittees => prevCommittees.filter(c => c.ID !== selectedCommitteeID));
      toggleDeleteModal(null);
    } catch (e) {
      console.log(e);
    }
  };
  
  return (
    <React.Fragment>
      <OverviewFilters committees={committees} applyFilters={applyFilters} />
      <div className={styles.overviewPage}>
        {filteredCommittees?.map(committee => {
          const status = committeeStatusLabel(committee?.IsActive);
          return (
            <div key={committee?.ID} className={styles.committeeCard}>
              <div className={styles.cardHeader}>
                <label className={`${styles.statusBadge} ${status.style}`}>{status.label}</label>
                <div className={styles.committeeHeader}>
                  <h6 className={styles.committeeName}>{committee?.ArabicName}</h6>
                  <MoreVertIcon
                    className={styles.committeeOptions}
                    fontSize='large'
                    onClick={() => toggleDropdown(committee?.ID)}
                  />
                </div>

                {activeDropdown === committee?.ID && (
                  <div
                    className={`${styles.optionsDropdown} ${
                      status.label === CommitteesStatus.ACTIVE ? styles.deactivate : styles.activate
                    }`}>
                    <button onClick={() => handleOptionClick(status.label, committee)} className={styles.dropdownOption}>
                      {status.label === CommitteesStatus.ACTIVE ? 'إلغاء التفعيل' : 'تفعيل'}
                    </button>
                    <button className={styles.dropdownOption} onClick={() => toggleDeleteModal(committee?.ID)}>
                      حذف
                    </button>
                  </div>
                )}
              </div>

              <div
                className={styles.committeeContentContainer}
                onClick={() => handleCardClick(committee?.ID, committee?.ArabicName)}>
                <span className={styles?.committeeDate}>
                  تاريخ تشكيل اللجنة: {new Date(committee?.FormationDate).toLocaleDateString('ar-EG')}
                </span>

                <div className={styles.committeeInfoContainer}>
                  <div className={styles.upcomingMeeting}>
                    <p style={{ textAlign: 'center' }}>الوقت المتبقي للاجتماع القادم</p>
                    {committee?.NextMeetingDate == null ? (
                      <span className={styles.upcomingMeetingTimer} style={{ textAlign: 'center' }}>
                        لا يوجد اجتماعات قادمة
                      </span>
                    ) : (
                      <>
                        <span style={{ textAlign: 'center' }}>{committee?.NextMeetingName || 'اسم الاجتماع غير متوفر'}</span>
                        <span className={styles.upcomingMeetingTimer}>{timeRemaining[committee?.ID]}</span>
                      </>
                    )}
                  </div>

                  <div className={styles.committeeDetails}>
                    <div className={styles.committeeDetails__group}>
                      <span>{committee?.LengthUpcomingMeetings} :الإجتماعات القادمة</span>
                      <FaCalendarAlt className={styles.metricIcon} />
                    </div>

                    <div className={styles.committeeDetails__group} style={{}}>
                      <span>{committee?.LengthPreviousMeetings} :الإجتماعات المنعقدة</span>
                      <FaCalendarAlt className={styles.metricIcon} />
                    </div>

                    <div className={styles.committeeDetails__group}>
                      <span>{committee?.LengthMembers} :عدد الأعضاء</span>
                      <FaUser className={styles.metricIcon} />
                    </div>

                    <div className={styles.committeeDetails__group}>
                      <span>{committee?.TaskCount} :عدد المهام</span>
                      <FaTasks className={styles.metricIcon} />
                    </div>
                  </div>
                </div>
                {/* 
                <div className={styles.tasksListContainer}>
                  <span className={styles.tasksListContainer__group} style={{ marginTop: '1rem' }}>
                    :المهام <FaTasks className={styles.metricIcon} />
                  </span>

                  <ul className={styles.tasksList}>
                    {committee?.tasks?.map(task => (
                      <li key={task?.label} className={`${styles.taskItem} ${styles[`task${task.color}`]}`}>
                        {task?.label}: {task?.count}
                        <FaCircle className={styles.taskIcon} />
                      </li>
                    ))}
                  </ul>
                </div> */}
              </div>
            </div>
          );
        })}

        <Modal open={isDeleteModalOpen} onClose={toggleDeleteModal} className={styles.modalContainer}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <DeleteIcon />
              <h3>مسح اللجنة؟</h3>
              <p>هل أنت متأكد أنك تريد مسح هذه اللجنة؟</p>
            </div>
            <div className={styles.deleteModalActions}>
              <button className={styles.cancelButton} onClick={toggleDeleteModal}>
                إلغاء
              </button>
              <button className={styles.deleteButton} onClick={handleCommitteeDeletion}>
                مسح
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </React.Fragment>
  );
};

export default Committees;
