import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeStage, setActiveStage] = useState(1);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Simulated data for testing
    useEffect(() => {
        const mockApplications = {
            1: [ // Stage 1: New Applications
                {
                    id: '1',
                    studentName: 'John Doe',
                    email: 'john@example.com',
                    phone: '+1234567890',
                    course: 'Computer Science',
                    appliedDate: '2024-03-15T10:00:00.000Z',
                    status: 'pending',
                    documents: ['transcript', 'recommendation'],
                    stage: 1
                },
                {
                    id: '2',
                    studentName: 'Jane Smith',
                    email: 'jane@example.com',
                    phone: '+1234567891',
                    course: 'Data Science',
                    appliedDate: '2024-03-14T15:30:00.000Z',
                    status: 'pending',
                    documents: ['transcript'],
                    stage: 1
                }
            ],
            2: [ // Stage 2: Document Verification
                {
                    id: '3',
                    studentName: 'Mike Johnson',
                    email: 'mike@example.com',
                    phone: '+1234567892',
                    course: 'Artificial Intelligence',
                    appliedDate: '2024-03-13T09:15:00.000Z',
                    status: 'in_review',
                    documents: ['transcript', 'recommendation', 'statement'],
                    stage: 2
                }
            ],
            3: [ // Stage 3: Final Approval
                {
                    id: '4',
                    studentName: 'Sarah Williams',
                    email: 'sarah@example.com',
                    phone: '+1234567893',
                    course: 'Cybersecurity',
                    appliedDate: '2024-03-12T14:20:00.000Z',
                    status: 'approved',
                    documents: ['transcript', 'recommendation', 'statement', 'interview'],
                    stage: 3
                }
            ]
        };

        setApplications(mockApplications);
    }, []);

    const handleLogout = () => {
        navigate('/');
    };

    const moveToNextStage = (applicationId, currentStage) => {
        if (currentStage >= 3) return;

        const nextStage = currentStage + 1;
        const updatedApplications = { ...applications };

        // Find the application and remove it from current stage
        const applicationToMove = applications[currentStage].find(app => app.id === applicationId);
        updatedApplications[currentStage] = applications[currentStage].filter(app => app.id !== applicationId);

        // Add to next stage
        if (applicationToMove) {
            applicationToMove.stage = nextStage;
            updatedApplications[nextStage] = [...(applications[nextStage] || []), applicationToMove];
        }

        setApplications(updatedApplications);
    };

    const getStageTitle = (stage) => {
        switch (stage) {
            case 1:
                return 'Stage 1: New Applications';
            case 2:
                return 'Stage 2: Document Verification';
            case 3:
                return 'Stage 3: Final Approval';
            default:
                return '';
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>Admin Dashboard</h1>
                    <div className="admin-info">
                        <span>Welcome, Admin</span>
                        <button onClick={handleLogout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="stage-selector">
                    {[1, 2, 3].map(stage => (
                        <button
                            key={stage}
                            className={`stage-btn ${activeStage === stage ? 'active' : ''}`}
                            onClick={() => setActiveStage(stage)}
                        >
                            {getStageTitle(stage)}
                            <span className="application-count">
                                {applications[stage]?.length || 0}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="dashboard-card">
                    <h2>{getStageTitle(activeStage)}</h2>
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="applications-container">
                        {applications[activeStage]?.map(application => (
                            <div key={application.id} className="application-card">
                                <div className="application-header">
                                    <h3>{application.studentName}</h3>
                                    <span className={`status-badge ${application.status}`}>
                                        {application.status}
                                    </span>
                                </div>
                                
                                <div className="application-details">
                                    <p><strong>Course:</strong> {application.course}</p>
                                    <p><strong>Email:</strong> {application.email}</p>
                                    <p><strong>Phone:</strong> {application.phone}</p>
                                    <p><strong>Applied:</strong> {new Date(application.appliedDate).toLocaleDateString()}</p>
                                </div>

                                <div className="documents-section">
                                    <h4>Documents Submitted:</h4>
                                    <div className="document-tags">
                                        {application.documents.map(doc => (
                                            <span key={doc} className="document-tag">{doc}</span>
                                        ))}
                                    </div>
                                </div>

                                {application.stage < 3 && (
                                    <button
                                        onClick={() => moveToNextStage(application.id, application.stage)}
                                        className="action-btn approve"
                                    >
                                        Move to {getStageTitle(application.stage + 1)}
                                    </button>
                                )}
                            </div>
                        ))}
                        
                        {(!applications[activeStage] || applications[activeStage].length === 0) && (
                            <div className="no-applications">
                                No applications in this stage
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;