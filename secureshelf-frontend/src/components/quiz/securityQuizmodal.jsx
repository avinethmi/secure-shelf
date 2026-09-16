import React, { useState } from 'react';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'How should security incidents be handled when detected?',
    options: ['Ignore them', 'Report immediately via the Incident Form', 'Share on social media'],
    correctIndex: 1
  },
  {
    id: 2,
    question: 'Are credentials allowed to be shared among staff?',
    options: ['Never', 'Only with cashiers', 'When requested by phone'],
    correctIndex: 0
  }
];

export default function SecurityQuizModal({ onQuizPassed }) {
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  const handleSelect = (questionId, optionIndex) => {
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let allCorrect = true;

    QUIZ_QUESTIONS.forEach((q) => {
      if (answers[q.id] !== q.correctIndex) {
        allCorrect = false;
      }
    });

    if (allCorrect && Object.keys(answers).length === QUIZ_QUESTIONS.length) {
      onQuizPassed();
    } else {
      setError('Incorrect answers selected. Please review security guidelines and try again.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Mandatory Security Quiz</h2>
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleSubmit}>
          {QUIZ_QUESTIONS.map((q) => (
            <div key={q.id} className="quiz-question-group">
              <p><strong>{q.question}</strong></p>
              {q.options.map((option, idx) => (
                <label key={idx} style={{ display: 'block' }}>
                  <input
                    type="radio"
                    name={`quiz-${q.id}`}
                    onChange={() => handleSelect(q.id, idx)}
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <button type="submit" className="modal-action-btn">Verify & Grant Access</button>
        </form>
      </div>
    </div>
  );
}