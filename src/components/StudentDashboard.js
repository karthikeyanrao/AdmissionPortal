import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import './StudentDashboard.css';
import { FiSearch, FiFilter, FiBook, FiCheckCircle, FiClock, FiAward, FiDollarSign } from 'react-icons/fi';
import ApplicationForm from './ApplicationForm';
import Navbar from './Navbar';
import { toast } from 'react-hot-toast';

// Graph Node for Application Status Tracking
class StatusNode {
    constructor(status) {
        this.status = status;
        this.adjacent = new Map(); // Map of adjacent nodes with timestamps
    }
}

// Graph for Application Status Flow
class ApplicationStatusGraph {
    constructor() {
        this.nodes = new Map();
    }

    addNode(status) {
        if (!this.nodes.has(status)) {
            this.nodes.set(status, new StatusNode(status));
        }
    }

    addEdge(status1, status2, timestamp) {
        if (!this.nodes.has(status1)) this.addNode(status1);
        if (!this.nodes.has(status2)) this.addNode(status2);

        this.nodes.get(status1).adjacent.set(status2, timestamp);
    }

    getStatusHistory(startStatus) {
        const history = [];
        const visited = new Set();
        
        const dfs = (currentStatus) => {
            visited.add(currentStatus);
            const node = this.nodes.get(currentStatus);
            
            node.adjacent.forEach((timestamp, nextStatus) => {
                if (!visited.has(nextStatus)) {
                    history.push({ from: currentStatus, to: nextStatus, timestamp });
                    dfs(nextStatus);
                }
            });
        };

        dfs(startStatus);
        return history;
    }
}

// Doubly Linked List for Application History
class HistoryNode {
    constructor(application) {
        this.application = application;
        this.next = null;
        this.prev = null;
        this.timestamp = new Date();
    }
}

class ApplicationHistory {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    addToHistory(application) {
        const newNode = new HistoryNode(application);
        
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.prev = this.tail;
            this.tail.next = newNode;
            this.tail = newNode;
        }
        
        this.size++;
    }

    getHistory() {
        const history = [];
        let current = this.head;
        while (current) {
            history.push({
                ...current.application,
                timestamp: current.timestamp
            });
            current = current.next;
        }
        return history;
    }
}

// LRU Cache for Recently Viewed Applications
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
        this.recent = new Set();
    }

    get(key) {
        if (!this.cache.has(key)) return null;
        
        // Move to most recent
        this.recent.delete(key);
        this.recent.add(key);
        
        return this.cache.get(key);
    }

    put(key, value) {
        if (this.cache.size >= this.capacity && !this.cache.has(key)) {
            // Remove least recently used
            const lru = this.recent.values().next().value;
            this.recent.delete(lru);
            this.cache.delete(lru);
        }
        
        this.cache.set(key, value);
        this.recent.delete(key);
        this.recent.add(key);
    }

    getRecent() {
        return Array.from(this.recent).map(key => this.cache.get(key));
    }
}

// QuickSort for Application Sorting
const quickSort = (applications, compareFunction) => {
    if (applications.length <= 1) return applications;

    const pivot = applications[Math.floor(applications.length / 2)];
    const left = [];
    const right = [];
    const equal = [];

    for (const app of applications) {
        const comparison = compareFunction(app, pivot);
        if (comparison < 0) left.push(app);
        else if (comparison > 0) right.push(app);
        else equal.push(app);
    }

    return [...quickSort(left, compareFunction), ...equal, ...quickSort(right, compareFunction)];
};

const StudentDashboard = () => {
    const [applications, setApplications] = useState([]);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [showFeeDetails, setShowFeeDetails] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applicationHistory] = useState(new ApplicationHistory());
    const [statusGraph] = useState(new ApplicationStatusGraph());
    const [recentlyViewed] = useState(new LRUCache(5)); // Store 5 recent applications

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
                
                // Convert timestamps to Date objects
                const appliedDate = data.appliedDate?.toDate?.() || new Date(data.appliedDate);
                const lastUpdated = data.lastUpdated?.toDate?.() || new Date(data.lastUpdated);
                
                // Handle fee details
                const feeDetails = data.feeDetails ? {
                    ...data.feeDetails,
                    dueDate: data.feeDetails.dueDate?.toDate?.() || new Date(data.feeDetails.dueDate),
                    tuitionFee: Number(data.feeDetails.tuitionFee) || 0,
                    admissionFee: Number(data.feeDetails.admissionFee) || 0,
                    libraryFee: Number(data.feeDetails.libraryFee) || 0,
                    laboratoryFee: Number(data.feeDetails.laboratoryFee) || 0,
                    otherFees: Number(data.feeDetails.otherFees) || 0,
                    totalFee: Number(data.feeDetails.totalFee) || 0,
                    paymentStatus: data.feeDetails.paymentStatus || 'Pending'
                } : null;
                
                const application = {
                    id: doc.id,
                    ...data,
                    appliedDate,
                    lastUpdated,
                    feeDetails
                };

                // Add to application history
                applicationHistory.addToHistory(application);

                // Update status graph
                if (application.previousStatus) {
                    statusGraph.addEdge(
                        application.previousStatus,
                        application.status,
                        application.lastUpdated
                    );
                }

                apps.push(application);
            });

            // Sort applications using QuickSort
            const sortedApps = quickSort(apps, (a, b) => 
                new Date(b.appliedDate) - new Date(a.appliedDate)
            );

            console.log('Processed applications with fee details:', sortedApps);
            setApplications(sortedApps);
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

    const handleStatClick = (status) => {
        setActiveFilter(status);
    };

    // Calculate stats
    const stats = applications.reduce((acc, app) => {
        acc.total++;
        const status = app.status?.toLowerCase();
        const stage = app.stage?.toLowerCase();

        if (status === 'accepted' || stage === 'stage2') {
            acc.selected++;
        } else if (status === 'rejected') {
            acc.rejected++;
        } else if (status === 'accepted' || stage === 'stage3' || status === 'approved') {
            acc.approved++;
        } else if (status === 'under review' || stage === 'stage1' || !stage || status === 'pending') {
            acc.underReview++;
        }
        
        return acc;
    }, {
        total: 0,
        selected: 0,
        approved: 0,
        underReview: 0,
        rejected: 0
    });

    // Filter applications based on search term and active filter
    const filteredApplications = applications.filter(app => {
        const matchesSearch = app.collegeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            app.program?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeFilter === 'all') return matchesSearch;
        
        const status = app.status?.toLowerCase();
        const stage = app.stage?.toLowerCase();
        
        switch(activeFilter) {
            case 'selected':
                return matchesSearch && (status === 'accepted' || stage === 'stage2');
            case 'approved':
                return matchesSearch && (status === 'accepted' || stage === 'stage3' || status === 'approved');
            case 'underReview':
                return matchesSearch && (status === 'under review' || stage === 'stage1' || !stage || status === 'pending');
            case 'rejected':
                return matchesSearch && status === 'rejected';
            default:
                return matchesSearch;
        }
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'stage1':
                return <FiClock className="status-icon" />;
            case 'stage2':
                return <FiCheckCircle className="status-icon" />;
            case 'stage3':
                return <FiAward className="status-icon" />;
            default:
                return null;
        }
    };

    const handleApplicationSuccess = () => {
        fetchMyApplications();
        setShowApplicationForm(false);
    };

    const handleCardClick = (application) => {
        // Don't show fee details for stage3 (approved) applications
        if (application.stage === 'stage3') {
            return;
        }

        // Show fee details for stage2 applications
        if (application.stage === 'stage2') {
            if (selectedApplication?.id === application.id) {
                setSelectedApplication(null);
                setShowFeeDetails(false);
            } else {
                setSelectedApplication(application);
                setShowFeeDetails(true);
            }
        }
    };

    const handleAcceptOffer = async (e, applicationId) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Find the application
            const application = applications.find(app => app.id === applicationId);
            if (!application) {
                console.error('Application not found');
                return;
            }

            // Confirm with the user
            const confirmed = window.confirm('Are you sure you want to accept this offer? This action cannot be undone.');
            if (!confirmed) return;

            // Update the application status in Firestore
            const applicationRef = doc(db, 'applications', applicationId);
            await updateDoc(applicationRef, {
                stage: 'stage3',
                status: 'ACCEPTED',
                lastUpdated: serverTimestamp()
            });

            // Update local state
            setApplications(prevApplications => 
                prevApplications.map(app => 
                    app.id === applicationId 
                        ? { ...app, stage: 'stage3', status: 'ACCEPTED' } 
                        : app
                )
            );

            toast.success('Offer accepted successfully!');
        } catch (error) {
            console.error('Error accepting offer:', error);
            toast.error('Failed to accept offer. Please try again.');
        }
    };

    const renderFeeStructure = (application) => {
        console.log('Rendering fee structure for application:', application);
        
        if (!application.feeDetails) {
            console.log('No fee details found for application:', application.id);
            return (
                <div className="fee-structure-section">
                    <h4><FiDollarSign className="fee-icon" /> Fee Structure</h4>
                    <div className="fee-details">
                        <p>Fee structure has not been set yet. Please contact the college administration.</p>
                        <p className="contact-info">College: {application.collegeName}</p>
                    </div>
                </div>
            );
        }

        console.log('Fee details found:', application.feeDetails);
        const {
            tuitionFee = 0,
            admissionFee = 0,
            libraryFee = 0,
            laboratoryFee = 0,
            otherFees = 0,
            totalFee = 0,
            dueDate,
            paymentStatus = 'Pending'
        } = application.feeDetails;

        const formatAmount = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(amount);
        };

        return (
            <div className="fee-structure-section">
                <h4><FiDollarSign className="fee-icon" /> Fee Structure</h4>
                <div className="fee-details">
                    <div className="fee-row">
                        <span>Tuition Fee:</span>
                        <span>{formatAmount(tuitionFee)}</span>
                    </div>
                    <div className="fee-row">
                        <span>Admission Fee:</span>
                        <span>{formatAmount(admissionFee)}</span>
                    </div>
                    <div className="fee-row">
                        <span>Library Fee:</span>
                        <span>{formatAmount(libraryFee)}</span>
                    </div>
                    <div className="fee-row">
                        <span>Laboratory Fee:</span>
                        <span>{formatAmount(laboratoryFee)}</span>
                    </div>
                    {otherFees > 0 && (
                        <div className="fee-row">
                            <span>Other Fees:</span>
                            <span>{formatAmount(otherFees)}</span>
                        </div>
                    )}
                    <div className="fee-row total">
                        <span>Total Fee:</span>
                        <span>{formatAmount(totalFee)}</span>
                    </div>
                    {dueDate && (
                        <div className="fee-row">
                            <span>Due Date:</span>
                            <span>{dueDate instanceof Date ? dueDate.toLocaleDateString() : new Date(dueDate).toLocaleDateString()}</span>
                        </div>
                    )}
                    <div className="fee-row">
                        <span>Payment Status:</span>
                        <span className={`payment-status ${paymentStatus.toLowerCase()}`}>
                            {paymentStatus}
                        </span>
                    </div>
                </div>
                {application.stage === 'stage2' && (
                    <div className="accept-offer-section">
                        <button 
                            className="accept-offer-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAcceptOffer(e, application.id);
                            }}
                        >
                            Accept Offer
                        </button>
                        <p className="accept-note">
                            By accepting this offer, you agree to the fee structure and terms.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Handle viewing application details
    const handleViewApplication = (application) => {
        // Add to recently viewed cache
        recentlyViewed.put(application.id, application);
        
        // Get status history
        const statusHistory = statusGraph.getStatusHistory(application.status);
        
        setSelectedApplication({
            ...application,
            statusHistory,
            recentlyViewed: recentlyViewed.getRecent()
        });
    };

    // Get application history
    const getApplicationHistory = () => {
        return applicationHistory.getHistory();
    };

    // Sort applications by different criteria
    const sortApplications = (criteria) => {
        const compareFunctions = {
            date: (a, b) => new Date(b.appliedDate) - new Date(a.appliedDate),
            status: (a, b) => a.status.localeCompare(b.status),
            college: (a, b) => a.collegeName.localeCompare(b.collegeName)
        };

        const sortedApps = quickSort(applications, compareFunctions[criteria]);
        setApplications(sortedApps);
    };

    return (
        <div className="student-dashboard">
            <Navbar onCreateApplication={() => setShowApplicationForm(true)} />
            
            {showApplicationForm && (
                <ApplicationForm
                    onClose={() => setShowApplicationForm(false)}
                    onSuccess={handleApplicationSuccess}
                />
            )}

            <div className="dashboard-content">
                <div className="dashboard-wrapper">
                    <div className="dashboard-container">
                        <div className="dashboard-header">
                            <h1>My Applications</h1>
                            <div className="dashboard-actions">
                                <div className="search-bar">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search by college or program..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="stats-container">
                            <div className="stats-card">
                                <h3>Application Statistics</h3>
                                <div className="stats-grid">
                                    <div 
                                        className={`stat-item clickable ${activeFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => handleStatClick('all')}
                                    >
                                        <span className="stat-label">Total Applications</span>
                                        <span className="stat-value">{stats.total}</span>
                                    </div>
                                    <div 
                                        className={`stat-item clickable ${activeFilter === 'selected' ? 'active' : ''}`}
                                        onClick={() => handleStatClick('selected')}
                                    >
                                        <span className="stat-label">Selected</span>
                                        <span className="stat-value selected">{stats.selected}</span>
                                    </div>
                                    <div 
                                        className={`stat-item clickable ${activeFilter === 'approved' ? 'active' : ''}`}
                                        onClick={() => handleStatClick('approved')}
                                    >
                                        <span className="stat-label">Approved</span>
                                        <span className="stat-value approved">{stats.approved}</span>
                                    </div>
                                    <div 
                                        className={`stat-item clickable ${activeFilter === 'underReview' ? 'active' : ''}`}
                                        onClick={() => handleStatClick('underReview')}
                                    >
                                        <span className="stat-label">Under Review</span>
                                        <span className="stat-value under-review">{stats.underReview}</span>
                                    </div>
                                    <div 
                                        className={`stat-item clickable ${activeFilter === 'rejected' ? 'active' : ''}`}
                                        onClick={() => handleStatClick('rejected')}
                                    >
                                        <span className="stat-label">Rejected</span>
                                        <span className="stat-value rejected">{stats.rejected}</span>
                                    </div>
                                </div>
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
                                    <p>No applications found{activeFilter !== 'all' ? ' for the selected status' : ''}. {activeFilter === 'all' && 'Start your academic journey today!'}</p>
                                    {activeFilter === 'all' && (
                                        <button 
                                            className="apply-btn"
                                            onClick={() => setShowApplicationForm(true)}
                                        >
                                            Apply Now
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="applications-grid">
                                    {filteredApplications.map((app) => (
                                        <div 
                                            key={app.id} 
                                            className={`application-card ${app.stage === 'stage2' ? 'clickable' : ''}`}
                                            onClick={() => handleCardClick(app)}
                                        >
                                            <div className="application-header">
                                                <h3>{app.collegeName}</h3>
                                                <div className="status-section">
                                                    <span className={`status-badge status-${app.stage}`}>
                                                        {getStatusIcon(app.stage)}
                                                        {app.stage === 'stage3' ? 'APPROVED' : 
                                                         app.stage === 'stage1' ? 'UNDER REVIEW' :
                                                         app.stage === 'stage2' ? 'ACCEPTED' : 'PENDING'}
                                                    </span>
                                                    {app.stage === 'stage2' && (
                                                        <button 
                                                            className="accept-offer-btn"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleAcceptOffer(e, app.id);
                                                            }}
                                                        >
                                                            Accept Offer
                                                        </button>
                                                    )}
                                                </div>
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
                                            
                                            {showFeeDetails && selectedApplication?.id === app.id && (
                                                renderFeeStructure(app)
                                            )}
                                            
                                            {app.stage === 'stage2' && selectedApplication?.id !== app.id && (
                                                <div className="view-fee-hint">
                                                    Click to view fee structure
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;