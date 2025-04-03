import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './StudentDashboard.css';
import { FiSearch, FiFilter, FiBook, FiCheckCircle, FiClock, FiAward } from 'react-icons/fi';
import ApplicationForm from './ApplicationForm';
import Navbar from './Navbar';

const StudentDashboard = () => {
    const [applications, setApplications] = useState([]);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all'
    });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('User authenticated:', user.uid);
                fetchMyApplications();
            } else {
                console.log('No user authenticated');
                setApplications([]);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchMyApplications = async () => {
        try {
            if (!auth.currentUser) {
                console.error('No authenticated user found');
                setLoading(false);
                return;
            }

            console.log('Fetching applications for user:', auth.currentUser.uid);
            const applicationsRef = collection(db, 'applications');
            
            const q = query(
                applicationsRef,
                where('studentId', '==', auth.currentUser.uid)
            );

            const querySnapshot = await getDocs(q);
            console.log('Raw query snapshot:', querySnapshot.size, 'documents found');
            
            const apps = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Application document:', doc.id, data);
                
                // Convert timestamp to Date if it exists
                const appliedDate = data.appliedDate?.toDate?.() || new Date();
                
                apps.push({ 
                    id: doc.id, 
                    ...data,
                    appliedDate
                });
            });

            // Sort by date (newest first)
            apps.sort((a, b) => b.appliedDate - a.appliedDate);

            console.log('Processed applications:', apps);
            setApplications(apps);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching applications:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            setApplications([]);
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const filteredApplications = applications.filter(app => {
        const matchesSearch = app.collegeName.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStatus = filters.status === 'all' || app.status === filters.status;
        return matchesSearch && matchesStatus;
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'under_review':
                return <FiClock className="status-icon" />;
            case 'selected':
                return <FiCheckCircle className="status-icon" />;
            case 'approved':
                return <FiAward className="status-icon" />;
            default:
                return null;
        }
    };

    const handleApplicationSuccess = () => {
        fetchMyApplications();
        setShowApplicationForm(false);
    };

    return (
        <div className="dashboard-wrapper">
            <Navbar />
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <h1>My Applications</h1>
                    <button 
                        className="apply-btn"
                        onClick={() => setShowApplicationForm(true)}
                    >
                        <FiBook className="btn-icon" />
                        Apply for Admission
                    </button>
                </div>

                <div className="filters-section">
                    <div className="filters-header">
                        <button 
                            className="filter-toggle"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <FiFilter className="filter-icon" />
                            Filters
                        </button>
                        <div className="search-bar">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search colleges..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    {showFilters && (
                        <div className="filters-container">
                            <div className="filter-group">
                                <label className="filter-label">Status</label>
                                <select 
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Status</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="selected">Selected</option>
                                    <option value="approved">Approved</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="stats-container">
                    <div className="stat-card">
                        <h3>Total Applications</h3>
                        <p>{applications.length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Under Review</h3>
                        <p>{applications.filter(app => app.status === 'under_review').length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Selected</h3>
                        <p>{applications.filter(app => app.status === 'selected').length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Approved</h3>
                        <p>{applications.filter(app => app.status === 'approved').length}</p>
                    </div>
                </div>

                <div className="applications-container">
                    {loading ? (
                        <div className="loading">
                            <div className="loading-spinner"></div>
                            <p>Loading your applications...</p>
                        </div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="no-applications">
                            <FiBook className="empty-icon" />
                            <p>No applications found. Start your academic journey today!</p>
                            <button 
                                className="apply-btn"
                                onClick={() => setShowApplicationForm(true)}
                            >
                                Apply Now
                            </button>
                        </div>
                    ) : (
                        <div className="applications-grid">
                            {filteredApplications.map((app) => (
                                <div key={app.id} className="application-card">
                                    <div className="application-header">
                                        <h3>{app.collegeName}</h3>
                                        <span 
                                            className={`status-badge status-${app.status}`}
                                        >
                                            {getStatusIcon(app.status)}
                                            {app.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="application-details">
                                        <p>
                                            <strong>Applied:</strong> {app.appliedDate.toLocaleDateString()}
                                        </p>
                                        <p>
                                            <strong>Course:</strong> {app.course}
                                        </p>
                                        <p>
                                            <strong>Application ID:</strong> {app.id.slice(0, 8)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showApplicationForm && (
                    <ApplicationForm 
                        onClose={() => setShowApplicationForm(false)}
                        onSuccess={handleApplicationSuccess}
                    />
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;