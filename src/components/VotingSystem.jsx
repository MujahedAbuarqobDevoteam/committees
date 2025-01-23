import React from 'react';
import { FaPlus } from 'react-icons/fa';

import styles from './styles/VotingSystem.module.scss';

const VotingSystem = ({ votings, handleVote, addNewVoting }) => {
  return (
    <div className={styles.votingContainer}>
      <div className={`${styles.sectionHeaderTitle} ${styles.flexSpaceBetween}`}>
        <button onClick={addNewVoting} className={styles.sharedButton}>
          إضافة تصويت جديد
          <FaPlus className={styles.addIcon}  />
        </button>
        <h5>نظام التصويت</h5>
      </div>
      <div className={styles.votingSection}>
        {votings?.map(voting => (
          <div key={voting.id} className={styles.votingCard}>
            <h5>{voting?.Question}</h5>
            <ul>
              {voting?.Choices?.map(choice => (
                <li key={choice.ID}>
                  <span>{choice.Text}</span>
                  <button onClick={() => handleVote(voting?.ID, choice?.ID)} className={styles.voteButton}>
                    تصويت
                  </button>
                  <span>{choice?.VoteCount} أصوات</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingSystem;
