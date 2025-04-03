import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import FeeForm from './FeeForm';
import ViewMore from './ViewMore';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [currentStage, setCurrentStage] = useState('stage1');
    const [loading, setLoading] = useState(true);
    const [adminCollege, setAdminCollege] = useState('');
    const [error, setError] = useState(null);
    const [selectedStage, setSelectedStage] = useState('all');
    const [showFeeForm, setShowFeeForm] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showViewMore, setShowViewMore] = useState(false);
    const [isUpdatingFee, setIsUpdatingFee] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                console.log('No user logged in, redirecting to login');
                navigate('/login');
                return;
            }

            try {
                console.log('Fetching admin data for user:', user.uid);
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                
                if (!userDoc.exists()) {
                    console.error('User document not found');
                    setError('User document not found');
                    navigate('/login');
                    return;
                }

                const userData = userDoc.data();
                console.log('User data:', userData);

                if (userData.role !== 'admin') {
                    console.error('User is not an admin');
                    setError('Unauthorized access');
                    navigate('/login');
                    return;
                }

                if (!userData.college) {
                    console.error('Admin college is not set');
                    setError('Admin college is not configured');
                    return;
                }

                console.log('Admin college:', userData.college);
                setAdminCollege(userData.college);
                await fetchApplications(userData.college);
            } catch (error) {
                console.error('Error in auth check:', error);
                setError('Error checking authentication: ' + error.message);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (applications.length > 0) {
            filterApplications(currentStage);
        }
    }, [applications, currentStage]);

    const fetchApplications = async (college) => {
        try {
            if (!college) {
                console.error('College name is undefined');
                setError('Error: College name is missing');
                setLoading(false);
                return;
            }

            console.log('Starting to fetch applications for college:', college);
            setLoading(true);
            setError(null);

            const applicationsRef = collection(db, 'applications');
            const q = query(applicationsRef, where('collegeName', '==', college));
            
            console.log('Executing Firestore query...');
            const querySnapshot = await getDocs(q);
            console.log('Query complete. Found documents:', querySnapshot.size);

            const apps = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Processing application:', doc.id, data);
                
                // Convert timestamps to dates if they exist
                const appliedDate = data.appliedDate?.toDate?.() || new Date(data.appliedDate);
                const lastUpdated = data.lastUpdated?.toDate?.() || new Date(data.lastUpdated);

                apps.push({
                    id: doc.id,
                    ...data,
                    appliedDate,
                    lastUpdated,
                    stage: data.stage || 'stage1'
                });
            });

            console.log('Processed applications:', apps.length);
            setApplications(apps);
            setFilteredApplications(apps); // Set initial filtered applications
        } catch (error) {
            console.error('Error fetching applications:', error);
            setError('Error fetching applications: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filterApplications = (stage) => {
        console.log('Filtering applications for stage:', stage);
        console.log('Total applications:', applications.length);
        
        if (stage === 'all') {
            setFilteredApplications(applications);
        } else {
            const filtered = applications.filter(app => app.stage === stage);
            console.log('Filtered applications:', filtered.length);
            setFilteredApplications(filtered);
        }
    };

    const handleStageChange = async (applicationId, currentStage, newStage) => {
        try {
            if (newStage === 'stage2') {
                // First show fee form and wait for fee details to be set
                setSelectedApplication(applicationId);
                setShowFeeForm(true);
                return; // Don't update stage yet - it will be updated after fee submission
            }

            const applicationRef = doc(db, 'applications', applicationId);
            
            // Get current application data
            const applicationDoc = await getDoc(applicationRef);
            if (!applicationDoc.exists()) {
                throw new Error('Application not found');
            }

            const currentData = applicationDoc.data();

            // For stage2, ensure fee details exist
            if (newStage === 'stage2' && !currentData.feeDetails) {
                alert('Please set fee details before moving to stage 2');
                setSelectedApplication(applicationId);
                setShowFeeForm(true);
                return;
            }

            await updateDoc(applicationRef, {
                stage: newStage,
                lastUpdated: new Date()
            });

            console.log(`Application ${applicationId} moved to ${newStage}`);
            await fetchApplications(adminCollege);
        } catch (error) {
            console.error('Error updating stage:', error);
            alert('Failed to update application stage. Please try again.');
        }
    };

    const handleFeeFormClose = () => {
        setShowFeeForm(false);
        setSelectedApplication(null);
        setIsUpdatingFee(false);
    };

    const handleUpdateFeeStructure = (application) => {
        setSelectedApplication(application.id);
        setShowFeeForm(true);
        setIsUpdatingFee(true);
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            setError('Error logging out: ' + error.message);
        }
    };

    const getStageCount = (stage) => {
        return applications.filter(app => app.stage === stage).length;
    };

    const handleStageFilter = (stage) => {
        setSelectedStage(stage);
    };

    const getFilteredApplications = () => {
        if (selectedStage === 'all') return applications;
        return applications.filter(app => app.stage === selectedStage);
    };

    const handleMoveToStage = (application) => {
        if (application.stage === 'stage1') {
            setSelectedApplication(application);
            setShowFeeForm(true);
        }
    };

    const handleFeeSubmit = async () => {
        await fetchApplications(adminCollege);
        setShowFeeForm(false);
        setSelectedApplication(null);
    };

    const handleViewMore = (application) => {
        setSelectedApplication(application);
        setShowViewMore(true);
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <div className="welcome-text">
                    {adminCollege ? `Welcome, Admin of ${adminCollege}` : 'Loading...'}
                </div>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="stage-cards">
                <div className={`stage-card ${currentStage === 'stage1' ? 'active' : ''}`}
                     onClick={() => setCurrentStage('stage1')}>
                    <h3>Stage 1: New Applications</h3>
                    <div className="count">{getStageCount('stage1')}</div>
                </div>
                <div className={`stage-card ${currentStage === 'stage2' ? 'active' : ''}`}
                     onClick={() => setCurrentStage('stage2')}>
                    <h3>Stage 2: Document Verification</h3>
                    <div className="count">{getStageCount('stage2')}</div>
                </div>
                <div className={`stage-card ${currentStage === 'stage3' ? 'active' : ''}`}
                     onClick={() => setCurrentStage('stage3')}>
                    <h3>Stage 3: Final Approval</h3>
                    <div className="count">{getStageCount('stage3')}</div>
                </div>
            </div>

            <div className="stage-content">
                <h2>{
                    currentStage === 'stage1' ? 'Stage 1: New Applications' :
                    currentStage === 'stage2' ? 'Stage 2: Document Verification' :
                    'Stage 3: Final Approval'
                }</h2>

                {loading ? (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>Loading applications...</p>
                    </div>
                ) : filteredApplications.length === 0 ? (
                    <div className="no-applications">
                        <FiFileText className="empty-icon" />
                        <p>No applications found for this stage</p>
                    </div>
                ) : (
                    <div className="applications-grid">
                        {filteredApplications.map((application) => (
                            <div key={application.id} className="application-card">
                                <div className="card-header">
                                    <h3>{application.fullName}</h3>
                                    <span className="status-badge">PENDING</span>
                                </div>
                                <div className="card-content">
                                    <div className="info-row">
                                        <label>Course:</label>
                                        <span>{application.course}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Email:</label>
                                        <span>{application.email}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Phone:</label>
                                        <span>{application.phone}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Applied:</label>
                                        <span>{application.appliedDate.toLocaleDateString()}</span>
                                    </div>
                                    
                                    <div className="documents-section">
                                        <h4>Documents Submitted:</h4>
                                        <div className="document-tags">
                                            {application.documents?.transcript && (
                                                <span className="document-tag">transcript</span>
                                            )}
                                            {application.documents?.recommendation && (
                                                <span className="document-tag">recommendation</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <div className="stage-buttons">
                                        {application.stage === 'stage1' && (
                                            <button 
                                                onClick={() => handleStageChange(application.id, application.stage, 'stage2')}
                                                className="stage-btn stage2-btn"
                                            >
                                                Move to Stage 2
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        className="action-btn view-more"
                                        onClick={() => handleViewMore(application)}
                                    >
                                        View Details
                                    </button>
                                    {application.stage === 'stage2' && (
                                        <button 
                                            className="action-btn fee-structure"
                                            onClick={() => handleUpdateFeeStructure(application)}
                                        >
                                            Update Fee Structure
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showFeeForm && selectedApplication && (
                <FeeForm 
                    applicationId={selectedApplication}
                    onClose={handleFeeFormClose}
                    onSubmitSuccess={handleFeeSubmit}
                    isUpdating={isUpdatingFee}
                />
            )}

            {showViewMore && selectedApplication && (
                <ViewMore
                    application={selectedApplication}
                    onClose={() => setShowViewMore(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;