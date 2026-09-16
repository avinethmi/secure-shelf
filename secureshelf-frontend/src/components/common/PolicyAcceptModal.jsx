import React, { useState } from 'react';

export default function PolicyAcceptModal({ policies, onAllAccepted }) {
  const [acceptedIds, setAcceptedIds] = useState([]);

  const toggleAcceptance = (id) => {
    if (acceptedIds.includes(id)) {
      setAcceptedIds(acceptedIds.filter((item) => item !== id));
    } else {
      setAcceptedIds([...acceptedIds, id]);
    }
  };

  const handleProceed = () => {
    if (acceptedIds.length === policies.length) {
      onAllAccepted();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Mandatory Policy Acknowledgement</h2>
        <p>You must review and accept all system and organizational policies to gain access.</p>
        
        <div className="policy-scroll-area">
          {policies.map((p) => (
            <div key={p.id} className="policy-card">
              <h3>{p.title} <small>({p.publishedBy})</small></h3>
              <p>{p.content}</p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptedIds.includes(p.id)}
                  onChange={() => toggleAcceptance(p.id)}
                />
                Accept Policy
              </label>
            </div>
          ))}
        </div>

        <button 
          disabled={acceptedIds.length !== policies.length} 
          onClick={handleProceed}
          className="modal-action-btn"
        >
          Proceed to Security Quiz
        </button>
      </div>
    </div>
  );
}