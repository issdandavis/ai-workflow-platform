/**
 * Projects Page - List and manage projects
 */

import React, { useState, useEffect } from "react";
import { projects } from "../lib/api";

export function ProjectsPage() {
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projects.list();
      setProjectList(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    setCreating(true);
    try {
      await projects.create(newProject);
      setNewProject({ name: "", description: "" });
      setShowCreate(false);
      loadProjects();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await projects.delete(id);
      loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h2>Your Projects</h2>
          <p className="subtitle">Manage your AI workflow projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Project</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="label">Project Name</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Description (optional)</label>
                <textarea
                  className="input textarea"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="What is this project about?"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="spinner" /> : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projectList.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <h3>No projects yet</h3>
          <p>Create your first project to get started with AI workflows</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projectList.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <h3 className="project-name">{project.name}</h3>
                <div className="project-actions">
                  <button className="btn btn-ghost btn-sm" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => handleDelete(project.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: "var(--error)" }}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}
              <div className="project-meta">
                <span className="badge badge-neutral">
                  {project.agentRuns?.length || 0} runs
                </span>
                <span className="project-date">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .projects-page {
          max-width: 1200px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .page-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 1rem;
        }
        .empty-icon {
          width: 64px;
          height: 64px;
          color: var(--text-dim);
          margin-bottom: 1rem;
        }
        .empty-state h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .project-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem;
          transition: border-color 0.2s;
        }
        .project-card:hover {
          border-color: var(--primary);
        }
        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }
        .project-name {
          font-size: 1.125rem;
          font-weight: 600;
        }
        .project-actions {
          display: flex;
          gap: 0.25rem;
        }
        .project-description {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .project-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .project-date {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1rem;
        }
        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          width: 100%;
          max-width: 480px;
          animation: fadeIn 0.2s ease-out;
        }
        .modal h3 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
