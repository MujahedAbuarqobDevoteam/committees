import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaPlus, FaChevronDown, FaTrash, FaArrowLeft } from 'react-icons/fa';

import { Checkbox, Modal } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';

import styles from './MeetingForms.module.scss';
import apiService from '../../../services/axiosApi.service';
import { useToast } from '../../../context';
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB, MeetingStatus, ToastMessage } from '../../../constants';
import { useFileUpload } from '../../../hooks/useFileUpload';

const MeetingFormCreate = () => {
  const location = useLocation();

  const { showToast } = useToast();
  const { mode, committeeId } = location?.state || {};

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formFields, setFormFields] = useState({
    name: '',
    committeeID: '',
    meetingTypeID: '',
    date: '',
    startTime: '',
    endTime: '',
    meetingLocationID: '',
    building: '',
    room: '',
    agenda: [],
    notes: '',
    link: '',
    members: [],
  });
  const [files, setFiles] = useState([]);

  const [fieldsFetchedItems, setFieldsFetchedItems] = useState({
    committees: [],
    locations: [],
    buildings: [],
    rooms: [],
    meetingTypes: [],
    members: [],
  });

  const handleAddAgenda = () => {
    setFormFields({ ...formFields, agenda: [...formFields?.agenda, ''] });
  };

  const handleDeleteAgenda = index => {
    const newAgenda = formFields?.agenda?.filter((item, i) => i !== index);
    setFormFields({ ...formFields, agenda: newAgenda });
  };

  const handleAgendaChange = (index, value) => {
    const newAgenda = formFields?.agenda?.map((item, i) => (i === index ? value : item));
    setFormFields({ ...formFields, agenda: newAgenda });
  };

  const handleCheckboxChange = (member, checked) => {
    if (checked) {
      setFormFields(prev => ({
        ...prev,
        members: [...prev.members, { UserID: member?.ID, UserFullName: member?.Name }],
      }));
    } else {
      setFormFields(prev => ({
        ...prev,
        members: prev.members.filter(m => m?.UserID !== member?.ID),
      }));
    }
  };

  const handleSelectAll = checked => {
    setSelectAll(checked);
    if (checked) {
      setFormFields(prev => ({
        ...prev,
        members: fieldsFetchedItems?.members?.map(member => ({
          UserID: member?.ID,
          UserFullName: member?.Name,
        })),
      }));
    } else {
      setFormFields(prev => ({ ...prev, members: [] }));
    }
  };

  const validateAndConvertFile = file => {
    return new Promise((resolve, reject) => {
      if (file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
        showToast(ToastMessage?.FileUploadSizeExceeding, 'error');
        reject(new Error('File too large'));
        return;
      }

      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        showToast(ToastMessage?.FileUploadExtensionNotAllowed, 'error');
        reject(new Error('Invalid file extension'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result.split(',')[1], extension, name: file.name });
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async event => {
    const selectedFiles = Array.from(event.target.files);

    try {
      const convertedFiles = await Promise.all(selectedFiles.map(validateAndConvertFile));
      setFiles(prev => [...prev, ...convertedFiles]);
    } catch (error) {
      console.error('File upload error:', error);
    }
  };

  const handleDeleteFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const locationsData = await apiService?.getAll('GetAllLocation');
        const buildingsData = await apiService?.getAll('GetAllBuildings');
        const roomsData = await apiService?.getAll('GetAllRoom');
        const meetingTypesData = await apiService?.getAll('GetAllMeetingType');
        const membersData = await apiService?.getById(`GetAllMember/`, localStorage.getItem('selectedCommitteeID'));

        setFieldsFetchedItems({
          locations: locationsData,
          buildings: buildingsData,
          rooms: roomsData,
          members: membersData,
          meetingTypes: meetingTypesData,
        });

        if (mode === 'add' && committeeId) {
          setFormFields(prev => ({
            ...prev,
            committeeID: committeeId,
          }));
        }
      } catch {
        console.log('error');
      }
    };
    fetchData();
  }, []);

  const handleSave = async e => {
    e.preventDefault();
    setLoading(true);

    const meetingPayload = {
      CommitteeID: parseInt(localStorage.getItem('selectedCommitteeID')),
      ArabicName: formFields?.name,
      EnglishName: formFields?.name,
      MeetingLocationID: parseInt(formFields?.meetingLocationID),
      BuildingID: parseInt(formFields?.building),
      RoomID: parseInt(formFields?.room),
      Date: formFields?.date,
      StartTime: formFields?.startTime,
      EndTime: formFields?.endTime,
      Notes: formFields?.notes,
      Link: formFields?.link,
      MeetingTypeID:1,
      StatusId: 1,
    };

    try {
      const response = await apiService.create('AddMeeting', meetingPayload);
      const newMeetingID = response?.ID;

      const nonEmptyAgendas = formFields?.agenda.filter(item => item.trim().length);
      for (const agendaItem of nonEmptyAgendas) {
        await apiService.create('AddAgenda', {
          MeetingID: newMeetingID,
          Sentence: agendaItem,
        });
      }

      for (const member of formFields?.members) {
        await apiService.create('AddMeetingMember', {
          MeetingID: newMeetingID,
          MemeberID: member?.UserID,
        });
      }

      for (const file of files) {
        await apiService.create('AddRelatedAttachmentMeeting', {
          CommitteeID: +localStorage.getItem('selectedCommitteeID'),
          MeetingID: newMeetingID,
          DocumentContent: file.base64,
          DocumentExt: file.extension,
          DocumentName: file.name,
          AttachmentTypeID: 1,
        });
      }

      showToast(ToastMessage?.MeetingSuccessCreation, 'success');
      window.history.back();
    } catch (error) {
      console.error('Error saving the Meeting, Agenda, or Members:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className={styles.createMeeting}>
      <div className={styles.formHeader}>
        <FaArrowLeft className={styles.backIcon} onClick={() => window.history.back()} />

        <h4>إنشاء اجتماع جديد</h4>
      </div>
      <form onSubmit={handleSave}>
        <div className={styles.formColumns}>
          {/***** Meeting Name *****/}
          <div className={styles.formGroup}>
            <label>اسم الاجتماع</label>
            <input
              type='text'
              value={formFields?.name}
              onChange={e => setFormFields({ ...formFields, name: e.target.value })}
              placeholder='أدخل اسم الاجتماع'
              required
            />
          </div>

          {/***** Committee *****/}
          <div className={styles.formGroup}>
            <label>اللجنة</label>
            <div className='select-container'>
              <select
                value={localStorage.getItem('selectedCommitteeID')}
                disabled={localStorage.getItem('selectedCommitteeID')}
                required>
                <option value={localStorage.getItem('selectedCommitteeID')}>
                  {localStorage.getItem('selectedCommitteeName')}
                </option>
              </select>
              <FaChevronDown />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>نوع الاجتماع</label>
            <div className='select-container'>
              <select
                value={formFields?.meetingTypeID}
                onChange={e => setFormFields({ ...formFields, meetingTypeID: e.target.value })}
                required>
                <option value='' disabled>
                  اختر نوع الاجتماع
                </option>
                {fieldsFetchedItems?.meetingTypes?.map(option => (
                  <option key={option?.ID} value={option?.ID}>
                    {option?.ArabicName}
                  </option>
                ))}
              </select>
              <FaChevronDown />
            </div>
          </div>

          {/***** Date, Start Time, End Time *****/}
          <div className={styles.formGroup}>
            <label>تاريخ الاجتماع</label>
            <input
              type='date'
              value={formFields?.date}
              onChange={e => setFormFields({ ...formFields, date: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>وقت البدء</label>
            <input
              type='time'
              value={formFields?.startTime}
              onChange={e => setFormFields({ ...formFields, startTime: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>وقت الانتهاء</label>
            <input
              type='time'
              value={formFields?.endTime}
              onChange={e => setFormFields({ ...formFields, endTime: e.target.value })}
              required
            />
          </div>

          {/***** Location *****/}
          <div className={styles.formGroup}>
            <label>نوع الموقع</label>
            <div className='select-container'>
              <select
                value={formFields?.meetingLocationID}
                onChange={e => setFormFields({ ...formFields, meetingLocationID: e.target.value })}
                required>
                <option value='' disabled>
                  اختر نوع الموقع
                </option>
                {fieldsFetchedItems?.locations?.map(option => (
                  <option key={option?.ID} value={option?.ID}>
                    {option?.ArabicName}
                  </option>
                ))}
              </select>
              <FaChevronDown />
            </div>
          </div>

          {formFields?.meetingLocationID === '1' ? (
            <>
              {/***** Building *****/}
              <div className={styles.formGroup}>
                <label>المبنى</label>
                <div className='select-container'>
                  <select
                    value={formFields?.building}
                    onChange={e => setFormFields({ ...formFields, building: e.target.value })}
                    required>
                    <option value='' disabled>
                      اختر المبنى
                    </option>
                    {fieldsFetchedItems?.buildings?.map(option => (
                      <option key={option?.ID} value={option?.ID}>
                        {option?.ArabicName}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown />
                </div>
              </div>

              {/***** Room *****/}
              <div className={styles.formGroup}>
                <label>الغرفة</label>
                <div className='select-container'>
                  <select
                    value={formFields?.room}
                    onChange={e => setFormFields({ ...formFields, room: e.target.value })}
                    required>
                    <option value='' disabled>
                      اختر الغرفة
                    </option>
                    {fieldsFetchedItems?.rooms?.map(option => (
                      <option key={option?.ID} value={option?.ID}>
                        {option?.ArabicName}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown />
                </div>
              </div>
            </>
          ) : formFields?.meetingLocationID === '2' ? (
            <div className={styles.formGroup}>
              <label>الرابط الالكتروني</label>
              <input
                type='text'
                value={formFields?.link}
                onChange={e => setFormFields({ ...formFields, link: e.target.value })}
                placeholder='أدخل الرابط الالكتروني'
                required
              />
            </div>
          ) : (
            <></>
          )}

          {/***** Agenda *****/}
          <div className={`${styles.formGroup} ${styles.formGroupFullWidth} `}>
            <div className={styles.agendaHeader}>
              <label className={styles.agendaLabel}>جدول الأعمال</label>
              <button type='button' className={styles.sharedButton} onClick={handleAddAgenda}>
                <FaPlus className={styles.icon} /> إضافة بند جديد
              </button>
            </div>

            <div className={styles.agendaContainer}>
              {/* Empty state */}
              {formFields.agenda.length === 0 && (
                <p className={styles.emptyState}>
                  لم يتم إضافة أي عناصر إلى جدول الأعمال حتى الآن. اضغط على "إضافة بند جديد" للبدء.
                </p>
              )}

              {/* Agenda Items */}
              <ul className={styles.agendaList}>
                {formFields?.agenda?.map((item, index) => (
                  <li key={index} className={styles.agendaItem}>
                    <input
                      className={styles.agendaInput}
                      value={item}
                      onChange={e => handleAgendaChange(index, e.target.value)}
                      placeholder='أدخل بند جدول الأعمال'
                    />
                    <button type='button' className={styles.removeAgendaButton} onClick={() => handleDeleteAgenda(index)}>
                      <FaTrash className={styles.icon} /> حذف
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/***** Notes *****/}
          <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
            <label>ملاحظات</label>
            <textarea
              value={formFields?.notes}
              onChange={e => setFormFields({ ...formFields, notes: e.target.value })}
              placeholder='أدخل ملاحظات الاجتماع'></textarea>
          </div>

          {/***** Members *****/}
          <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
            <div className={styles.usersTableHeader}>
              <label>أعضاء الاجتماع</label>
              <button type='button' className={styles.sharedButton} onClick={() => setIsModalOpen(true)}>
                <FaPlus /> إضافة أعضاء
              </button>
            </div>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                  </tr>
                </thead>
                <tbody>
                  {formFields?.members?.length === 0 ? (
                    <tr>
                      <td>
                        <p className={styles.emptyTableLabel}>لا يوجد أعضاء</p>
                      </td>
                    </tr>
                  ) : (
                    formFields?.members?.map(member => (
                      <tr key={member?.UserID}>
                        <td>{member?.UserFullName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/************ Files ***********/}
          <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
            <label htmlFor='fileInput'>تحميل المرفقات</label>
            <div className={styles.uploadContainer}>
              <button type='button' className={styles.uploadButton} onClick={() => document.getElementById('fileInput').click()}>
                اختر الملفات
              </button>
              <input type='file' id='fileInput' multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              <ul className={styles.fileList}>
                {files.map((file, index) => (
                  <li key={index} className={styles.fileItem}>
                    <span className={styles.fileName}>{file.name}</span>
                    <button type='button' className={styles.deleteFileButton} onClick={() => handleDeleteFile(index)}>
                      <FaTrash className={styles.deleteIcon} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/***** Form Buttons *****/}
        <div className={styles.formButtonsContainer}>
          <button type='submit' className={`${styles.saveButton} ${loading ? styles.loading : ''}`} disabled={loading}>
            <SaveIcon /> حفظ
            {loading && <span className={styles.loader}></span>}
          </button>

          <button type='button' className={styles.cancelButton} onClick={() => window.history.back()} disabled={loading}>
            <CancelIcon /> الغاء
          </button>
        </div>
      </form>

      {/* Members Modal */}
      <Modal open={isModalOpen} onClose={toggleModal} className={styles.usersModal}>
        <div className={`${styles.modal} ${styles.tableContainer}`}>
          <table>
            <thead>
              <tr>
                <th>
                  <Checkbox checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} />
                </th>
                <th>الاسم</th>
              </tr>
            </thead>
            <tbody>
              {fieldsFetchedItems?.members?.length > 0 ? (
                fieldsFetchedItems?.members?.map((member, index) => (
                  <tr key={index}>
                    <td>
                      <Checkbox
                        checked={formFields.members.some(m => m?.UserID === member?.ID)}
                        onChange={e => handleCheckboxChange(member, e.target.checked)}
                      />
                    </td>
                    <td>{member?.Name}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '3rem' }}>
                    يرجى اضافة لجنة لهذا الإجتماع اولاً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className={`${styles.formButtonsContainer} ${styles.usersFormButtonsContainer}`}>
            <button type='button' className={styles.usersCancelButton} onClick={toggleModal}>
              الغاء
              <CancelIcon />
            </button>
            <button
              type='button'
              disabled={formFields.members.length === 0}
              className={`${styles.usersSaveButton} ${formFields.members.length === 0 ? `${styles.disabled}` : ''}`}
              onClick={toggleModal}>
              إضافة <SaveIcon />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MeetingFormCreate;
