import React, { useEffect, useState } from 'react';
import { FaUpload, FaFile, FaTrashAlt, FaChevronDown, FaPlus, FaTrash, FaArrowLeft } from 'react-icons/fa';
import styles from './CommitteeForms.module.scss';

import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import { Checkbox, Modal } from '@mui/material';
import { CommitteeServices } from '../services/committees.service';
import apiService from '../../../services/axiosApi.service';
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB, ToastMessage } from '../../../constants';
import { useToast } from '../../../context';

const CommitteeFormCreate = () => {
  const { showToast } = useToast();

  const [formFields, setFormFields] = useState({
    name: '',
    number: '',
    shortName: '',
    meetingTemplateName: '',

    formationDate: '',
    startDate: '',
    endDate: '',

    departmentID: '',
    categoryID: '',
    members: [],
  });
  console.log('🚀 ~ CommitteeFormCreate ~ formFields:', formFields);

  const [fieldsFetchedItems, setFieldsFetchedItems] = useState({
    departments: [],
    categories: [],
    users: [],
    roles: [],
    permissions: [],
    fileTypes: [],
  });
  const [files, setFiles] = useState([]);
  console.log('🚀 ~ CommitteeFormCreate ~ files:', files);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState({});

  useEffect(() => {
    apiService.getAll('/GetAllCommCat').then(data => setFieldsFetchedItems(prev => ({ ...prev, categories: data })));
    apiService.getAll('/GetAllDepartment').then(data => setFieldsFetchedItems(prev => ({ ...prev, departments: data })));
    apiService.getAll('/GetAllSystemUser').then(data => setFieldsFetchedItems(prev => ({ ...prev, users: data })));
    apiService.getAll('/GetAllRole').then(data => setFieldsFetchedItems(prev => ({ ...prev, roles: data })));
    apiService.getAll('/GetAllPermission').then(data => setFieldsFetchedItems(prev => ({ ...prev, permissions: data })));
    apiService.getAll('/GetAllAttachmentType').then(data => setFieldsFetchedItems(prev => ({ ...prev, fileTypes: data })));
  }, []);

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
      const convertedFiles = await Promise.all(selectedFiles?.map(validateAndConvertFile));
      setFiles(prev => [...prev, ...convertedFiles]);
    } catch (error) {
      console.error('File upload error:', error);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const preparedData = {
      ArabicName: formFields?.name,
      EnglishName: formFields?.name,
      Number: formFields?.number,
      ShortName: formFields?.shortName,
      MeetingTemplateName: formFields?.meetingTemplateName,
      FormationDate: formFields?.formationDate,
      StartDate: formFields?.startDate,
      EndDate: formFields?.endDate,
      CategoryID: parseInt(formFields?.categoryID),
      DepID: parseInt(formFields?.departmentID),
      IsActive: true,
    };
    console.log("🚀 ~ CommitteeFormCreate ~ preparedData:", preparedData)

    try {
      const response = await CommitteeServices.create(preparedData);

      const membersData = formFields?.members?.map(member => ({
        CommitteeID: response?.ID,
        UserID: member?.id,
        RoleID: parseInt(member?.role),
        Permissions: selectedUsers[member?.id]?.permissions || [],
      }));
      console.log('🚀 ~ CommitteeFormCreate ~ membersData:', membersData);

      await apiService.create('AddMemberToCommittee', membersData);

      for (const file of files) {
        await apiService.create('AddRelatedAttachment', {
          CommitteeID: response?.ID,
          DocumentContent: file?.base64,
          DocumentExt: file?.extension,
          DocumentName: file?.name,
          AttachmentTypeID: file?.type ? +file?.type : 1,
          CreatedAt: new Date().toISOString(),
        });
      }

      window.history.back();
    } catch (error) {
      console.error('Error adding the Committee:', error);
    }
  };

  const handleDeleteFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleCheckboxChange = (userId, checked) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: { ...prev[userId], userId: userId, role: checked ? fieldsFetchedItems?.roles[0]?.name : '', checked },
    }));
  };

  const addMembers = () => {
    const newMembers = Object.entries(selectedUsers)
      .filter(([, user]) => user.checked && user.role)
      ?.map(([id, user]) => ({
        id: Number(id),
        name: fieldsFetchedItems?.users.find(u => u.ID === Number(id)).UserFullName,
        role: user.role,
        roleID: fieldsFetchedItems?.roles.find(r => r.ArabicName === user.role)?.ID,
      }));
    setFormFields({ ...formFields, members: newMembers });
    toggleModal();
  };

  const handleDeleteMember = index => {
    const memberToRemove = formFields?.members[index];
    setFormFields(prev => ({ ...prev, members: prev.members.filter((_, i) => i !== index) }));

    setSelectedUsers(prev => {
      const updatedUsers = { ...prev };
      if (memberToRemove) {
        delete updatedUsers[memberToRemove.id];
      }
      return updatedUsers;
    });
  };

  const fetchRolePermissions = async (userId, roleId) => {
    try {
      const rolePermissionsData = await apiService.getById('GetRolePermission', roleId);
      setSelectedUsers(prevState => ({
        ...prevState,
        [userId]: {
          ...prevState?.[userId],
          role: roleId,
          permissions: rolePermissionsData?.map(p => ({
            ID: p?.Permission?.ID,
            isGranted: p?.IsGranted,
          })),
        },
      }));
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: { ...prev?.[userId], role },
    }));
    await fetchRolePermissions(userId, role);
  };

  const handlePermissionToggle = (userId, permissionId) => {
    setSelectedUsers(prevState => ({
      ...prevState,
      [userId]: {
        ...prevState?.[userId],
        permissions: prevState?.[userId]?.permissions?.map(p => (p?.ID === permissionId ? { ...p, isGranted: !p.isGranted } : p)),
      },
    }));
  };

  const handleFileTypeChange = (e, index) => {
    const selectedFile = files[index];
    selectedFile.type = e.target.value;
    setFiles(prev => [...prev.slice(0, index), selectedFile, ...prev.slice(index + 1)]);
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <FaArrowLeft className={styles.backIcon} onClick={() => window.history.back()} />
        <h4>إضافة لجنة جديدة</h4>
      </div>
      <form>
        <div className={styles.formColumns}>
          <div className={styles.formGroup}>
            <label>اسم اللجنة</label>
            <input
              type='text'
              id='committeeName'
              value={formFields?.name}
              onChange={e => setFormFields({ ...formFields, name: e.target.value })}
              placeholder='أدخل اسم اللجنة'
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>رقم اللجنة</label>
            <input
              type='text'
              id='committeeNumber'
              value={formFields?.number}
              onChange={e => setFormFields({ ...formFields, number: e.target.value })}
              placeholder='أدخل رقم اللجنة'
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>اسم اللجنة المختصر</label>
            <input
              type='text'
              id='shortName'
              value={formFields?.shortName}
              onChange={e => setFormFields({ ...formFields, shortName: e.target.value })}
              placeholder='أدخل اسم اللجنة المختصر'
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>اسم نموذج الإجتماع</label>
            <input
              type='text'
              id='templateName'
              value={formFields?.meetingTemplateName}
              onChange={e => setFormFields({ ...formFields, meetingTemplateName: e.target.value })}
              placeholder='أدخل اسم نموذج الإجتماع'
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>تاريخ تشكيل اللجنة</label>
            <input
              type='date'
              value={formFields?.formationDate}
              onChange={e => setFormFields({ ...formFields, formationDate: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>تاريخ البدء</label>
            <input
              type='date'
              id='startDate'
              value={formFields?.startDate}
              onChange={e => setFormFields({ ...formFields, startDate: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>تاريخ الانتهاء</label>
            <input
              type='date'
              id='endDate'
              value={formFields?.endDate}
              onChange={e => setFormFields({ ...formFields, endDate: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label>نوع اللجنة</label>
            <div className={`${styles.selectContainer} select-container`}>
              <select
                id='committeeType'
                value={formFields?.categoryID}
                onChange={e => setFormFields({ ...formFields, categoryID: e.target.value })}
                required>
                <option value='' disabled>
                  اختر نوع اللجنة
                </option>
                {fieldsFetchedItems?.categories?.map(type => (
                  <option key={type?.ID} value={type?.ID}>
                    {type?.ArabicName}
                  </option>
                ))}
              </select>
              <FaChevronDown />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>اختر القسم</label>
            <div className={`${styles.selectContainer} select-container`}>
              <select
                id='departmentType'
                value={formFields?.departmentID}
                onChange={e => setFormFields({ ...formFields, departmentID: e.target.value })}
                required>
                <option value='' disabled>
                  اختر القسم
                </option>
                {fieldsFetchedItems?.departments?.map(type => (
                  <option key={type?.ID} value={type?.ID}>
                    {type?.ArabicName}
                  </option>
                ))}
              </select>
              <FaChevronDown />
            </div>
          </div>

          <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
            <div className={styles.usersTableHeader}>
              <label>أعضاء اللجنة</label>
              <button type='button' className={styles.sharedButton} onClick={toggleModal}>
                <FaPlus /> إضافة أعضاء
              </button>
            </div>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الدور</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {formFields?.members.length === 0 ? (
                    <tr>
                      <td colSpan='3'>
                        <p className={styles.emptyTableLabel}>لا يوجد أعضاء</p>
                      </td>
                    </tr>
                  ) : (
                    formFields?.members?.map((member, index) => (
                      <tr key={index}>
                        <td>{member?.name}</td>
                        <td>{fieldsFetchedItems.roles.find(r => r.ID === parseInt(member?.role))?.ArabicName}</td>
                        <td>
                          <button type='button' className={styles.deleteButton} onClick={() => handleDeleteMember(index)}>
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Modal open={isModalOpen} onClose={toggleModal} className={styles.usersModal}>
            <div className={`${styles.modal} ${styles.tableContainer}`}>
              <table>
                <thead>
                  <tr>
                    <th>الصلاحيات</th>
                    <th>الدور</th>
                    <th>الاسم</th>
                    <th>إضافة</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldsFetchedItems?.users?.map(user => (
                    <tr key={user?.ID}>
                      <td>
                        <div className={styles.permissionsList}>
                          {fieldsFetchedItems?.permissions?.map(permission => (
                            <div key={permission?.ID} className={styles.permissionItem}>
                              <label htmlFor={`${user?.ID}-${permission?.ID}`}>{permission?.ArabicName}</label>
                              <input
                                type='checkbox'
                                id={`${user?.ID}-${permission?.ID}`}
                                disabled={!selectedUsers[user?.ID]?.role}
                                checked={
                                  selectedUsers[user?.ID]?.permissions?.find(p => p.ID === permission.ID)?.isGranted || false
                                }
                                onChange={() => handlePermissionToggle(user?.ID, permission.ID)}
                              />
                            </div>
                          ))}
                        </div>
                      </td>

                      <td>
                        <select
                          value={selectedUsers[user?.ID]?.role || ''}
                          disabled={!selectedUsers[user?.ID]?.checked}
                          onChange={e => handleRoleChange(user?.ID, e.target.value)}
                          className={styles.roleSelect}>
                          <option value='' disabled>
                            اختر دور
                          </option>
                          {fieldsFetchedItems?.roles?.map(role => (
                            <option
                              key={role?.ID}
                              value={role?.ID}
                              disabled={selectedUsers[user?.ID]?.role && selectedUsers[user?.ID]?.role !== role?.ArabicName}>
                              {role?.ArabicName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>{user?.UserFullName}</td>

                      <td>
                        <Checkbox
                          checked={selectedUsers[user?.ID]?.checked || false}
                          onChange={e => handleCheckboxChange(user?.ID, e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={`${styles.formButtonsContainer} ${styles.usersFormButtonsContainer}`}>
                <button type='button' className={styles.usersCancelButton} onClick={toggleModal}>
                  الغاء <CancelIcon />
                </button>
                <button type='button' className={styles.usersSaveButton} onClick={addMembers}>
                  إضافة <SaveIcon />
                </button>
              </div>
            </div>
          </Modal>

          {/************************* Committee Files *************************/}
          <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
            <label>تحميل المرفقات</label>
            <div className={styles.uploadContainer}>
              <button type='button' className={styles.uploadButton} onClick={() => document.getElementById('fileInput').click()}>
                اختر الملفات
              </button>
              <input type='file' id='fileInput' multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              <ul className={styles.fileList}>
                {files?.map((file, index) => (
                  <li key={index} className={styles.fileItem}>
                    <span className={styles.fileName}>{file?.name}</span>
                    <div className={styles.fileActionsContainer}>
                      <select value={files[index]?.type || ''} onChange={e => handleFileTypeChange(e, index)}>
                        <option value='' disabled>
                          اختر نوع الملف
                        </option>
                        {fieldsFetchedItems?.fileTypes?.map(type => (
                          <option key={type?.ID} value={type?.ID}>
                            {type?.ArabicName}
                          </option>
                        ))}
                      </select>

                      <button type='button' className={styles.deleteFileButton} onClick={() => handleDeleteFile(index)}>
                        <FaTrash className={styles.deleteIcon} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className={styles.formButtonsContainer}>
          <button type='submit' className={styles.saveButton} onClick={handleSubmit}>
            <SaveIcon /> حفظ
          </button>
          <button type='button' className={styles.cancelButton}>
            <CancelIcon /> الغاء
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommitteeFormCreate;
