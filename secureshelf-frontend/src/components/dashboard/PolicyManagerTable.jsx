import React, { useState } from 'react';

export default function PolicyManagerTable({ policies, userRole, onPublishPolicy, onRemovePolicy }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const canPublish = userRole === 'Owner' || userRole === 'Security Admin';

  const handlePublish = (e) => {
    e.preventDefault();
    onPublishPolicy({
      id: Date.now(),
      title,
      content,
      publishedBy: userRole,
      authorId: userRole
    });
    setTitle('');
    setContent('');
  };

  return (
    <div className="section-container">
      {canPublish && (
        <div className="publish-card">
          <h2>Publish New Policy</h2>
          <form onSubmit={handlePublish}>
            <div className="form-row">
              <label htmlFor="policy-title">Policy Title</label>
              <input
                id="policy-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row align-top">
              <label htmlFor="policy-wording">Policy Wording</label>
              <textarea
                id="policy-wording"
                rows="4"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="publish-btn">
              Publish Policy
            </button>
          </form>
        </div>
      )}

      <h2>Published Policies</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Content</th>
            <th>Published By</th>
            {canPublish && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.title}</td>
              <td>{p.content}</td>
              <td>{p.publishedBy}</td>
              {canPublish && (
                <td>
                  <button 
                    className="danger-btn" 
                    onClick={() => onRemovePolicy(p.id)}
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}