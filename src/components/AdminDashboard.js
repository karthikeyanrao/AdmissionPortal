import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import FeeForm from './FeeForm';
import ViewMore from './ViewMore';
import './AdminDashboard.css';

// Binary Search Tree Node
class BSTNode {
    constructor(application) {
        this.application = application;
        this.left = null;
        this.right = null;
    }
}

// Hash Table for O(1) application lookup
class HashTable {
    constructor(size = 53) {
        this.keyMap = new Array(size);
    }

    _hash(key) {
        let total = 0;
        let WEIRD_PRIME = 31;
        for (let i = 0; i < Math.min(key.length, 100); i++) {
            let char = key[i];
            let value = char.charCodeAt(0) - 96;
            total = (total * WEIRD_PRIME + value) % this.keyMap.length;
        }
        return total;
    }

    set(key, value) {
        let index = this._hash(key);
        if (!this.keyMap[index]) {
            this.keyMap[index] = [];
        }
        this.keyMap[index].push([key, value]);
    }

    get(key) {
        let index = this._hash(key);
        if (this.keyMap[index]) {
            for (let i = 0; i < this.keyMap[index].length; i++) {
                if (this.keyMap[index][i][0] === key) {
                    return this.keyMap[index][i][1];
                }
            }
        }
        return undefined;
    }
}

// Priority Queue for managing urgent applications
class PriorityQueue {
    constructor() {
        this.values = [];
    }

    enqueue(application, priority) {
        this.values.push({application, priority});
        this._bubbleUp();
    }

    dequeue() {
        const max = this.values[0];
        const end = this.values.pop();
        if (this.values.length > 0) {
            this.values[0] = end;
            this._sinkDown();
        }
        return max;
    }

    _bubbleUp() {
        let idx = this.values.length - 1;
        const element = this.values[idx];
        while (idx > 0) {
            let parentIdx = Math.floor((idx - 1) / 2);
            let parent = this.values[parentIdx];
            if (element.priority <= parent.priority) break;
            this.values[parentIdx] = element;
            this.values[idx] = parent;
            idx = parentIdx;
        }
    }

    _sinkDown() {
        let idx = 0;
        const length = this.values.length;
        const element = this.values[0];
        while (true) {
            let leftChildIdx = 2 * idx + 1;
            let rightChildIdx = 2 * idx + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIdx < length) {
                leftChild = this.values[leftChildIdx];
                if (leftChild.priority > element.priority) {
                    swap = leftChildIdx;
                }
            }
            if (rightChildIdx < length) {
                rightChild = this.values[rightChildIdx];
                if (
                    (swap === null && rightChild.priority > element.priority) || 
                    (swap !== null && rightChild.priority > leftChild.priority)
                ) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.values[idx] = this.values[swap];
            this.values[swap] = element;
            idx = swap;
        }
    }
}

// Trie Node for search suggestions
class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.applications = [];
    }
}

// Trie for efficient name search
class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word, application) {
        if (!word) return; // Skip if word is empty
        
        let node = this.root;
        // Convert name to lowercase and split into words
        const words = word.toLowerCase().split(' ');
        
        // Insert each word in the name
        words.forEach(word => {
            for (let char of word) {
                if (!node.children[char]) {
                    node.children[char] = new TrieNode();
                }
                node = node.children[char];
                // Store unique applications (avoid duplicates)
                if (!node.applications.some(app => app.id === application.id)) {
                    node.applications.push(application);
                }
            }
            node.isEndOfWord = true;
        });
    }

    search(prefix) {
        if (!prefix) return [];
        
        let node = this.root;
        prefix = prefix.toLowerCase();
        
        // Navigate to the last node of the prefix
        for (let char of prefix) {
            if (!node.children[char]) {
                return [];
            }
            node = node.children[char];
        }
        
        // Return the applications stored at this node
        return node.applications;
    }

    // Clear all data from the trie
    clear() {
        this.root = new TrieNode();
    }
}

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

    // Initialize data structures with useRef to maintain persistence
    const searchTrieRef = useRef(new Trie());
    const [applicationBST, setApplicationBST] = useState(null);
    const [applicationHash] = useState(new HashTable());
    const [urgentQueue] = useState(new PriorityQueue());
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Function to insert into BST
    const insertIntoBST = (root, application) => {
        if (!root) return new BSTNode(application);
        
        if (new Date(application.appliedDate) < new Date(root.application.appliedDate)) {
            root.left = insertIntoBST(root.left, application);
        } else {
            root.right = insertIntoBST(root.right, application);
        }
        return root;
    };

    // Function to get applications in order (inorder traversal)
    const getInorderApplications = (root, result = []) => {
        if (root) {
            getInorderApplications(root.left, result);
            result.push(root.application);
            getInorderApplications(root.right, result);
        }
        return result;
    };

    // Enhanced fetchApplications with DSA
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

            let root = null;
            const apps = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const application = {
                    id: doc.id,
                    ...data,
                    appliedDate: data.appliedDate?.toDate?.() || new Date(data.appliedDate),
                    lastUpdated: data.lastUpdated?.toDate?.() || new Date(data.lastUpdated),
                    stage: data.stage || 'stage1'
                };

                // Insert into BST
                root = insertIntoBST(root, application);
                
                // Add to Hash Table for O(1) lookup
                applicationHash.set(doc.id, application);
                
                // Add to Priority Queue if urgent
                if (application.stage === 'stage1') {
                    const priority = new Date(application.appliedDate).getTime();
                    urgentQueue.enqueue(application, priority);
                }

                apps.push(application);
            });

            setApplicationBST(root);
            setApplications(apps);
            setFilteredApplications(apps);
        } catch (error) {
            console.error('Error fetching applications:', error);
            setError('Error fetching applications: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Enhanced application lookup - O(1) time complexity
    const getApplicationById = (id) => {
        return applicationHash.get(id);
    };

    // Get applications sorted by date using BST - O(n) time complexity
    const getSortedApplications = () => {
        return applicationBST ? getInorderApplications(applicationBST) : [];
    };

    // Get urgent applications using Priority Queue
    const getUrgentApplications = () => {
        const temp = new PriorityQueue();
        const urgent = [];
        while (urgentQueue.values.length) {
            const item = urgentQueue.dequeue();
            urgent.push(item.application);
            temp.enqueue(item.application, item.priority);
        }
        // Restore the queue
        while (temp.values.length) {
            const item = temp.dequeue();
            urgentQueue.enqueue(item.application, item.priority);
        }
        return urgent;
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

    // Enhanced search functionality
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
        if (term.length >= 2) {
            console.log('Searching for:', term);
            const suggestions = searchTrieRef.current.search(term);
            console.log('Found suggestions:', suggestions.length);
            setSearchSuggestions(suggestions.slice(0, 10)); // Limit to 10 suggestions
        } else {
            setSearchSuggestions([]);
        }
    }, []);

    // Handle suggestion click with improved navigation
    const handleSuggestionClick = useCallback((application) => {
        console.log('Selected application:', application);
        
        // Switch to the application's stage
        setCurrentStage(application.stage);
        
        // Filter applications for this stage
        const filtered = applications.filter(app => app.stage === application.stage);
        setFilteredApplications(filtered);
        
        // Clear search
        setSearchTerm('');
        setSearchSuggestions([]);
        
        // Highlight the selected application
        setSelectedApplication(application);
        
        // Scroll to the application card with smooth animation
        setTimeout(() => {
            const element = document.getElementById(`application-${application.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlighted');
                setTimeout(() => element.classList.remove('highlighted'), 2000);
            }
        }, 100);
    }, [applications]);

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

            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="search-input"
                />
                {searchSuggestions.length > 0 && (
                    <div className="search-suggestions">
                        {searchSuggestions.map((app, index) => (
                            <div 
                                key={`${app.id}-${index}`}
                                className="suggestion-item"
                                onClick={() => handleSuggestionClick(app)}
                            >
                                <div className="suggestion-name">
                                    {app.studentName || app.fullName}
                                    <div className="suggestion-email">{app.email}</div>
                                </div>
                                <div className="suggestion-info">
                                    <span className={`stage-indicator ${app.stage}`}>
                                        {app.stage === 'stage1' ? 'Need to Review' :
                                         app.stage === 'stage2' ? 'Shortlisted' :
                                         'Accepted'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="stage-cards">
                <div className={`stage-card ${currentStage === 'stage1' ? 'active' : ''}`}
                     onClick={() => setCurrentStage('stage1')}>
                    <h3>Stage 1: Need to Review</h3>
                    <div className="count">{getStageCount('stage1')}</div>
                </div>
                <div className={`stage-card ${currentStage === 'stage2' ? 'active' : ''}`}
                     onClick={() => setCurrentStage('stage2')}>
                    <h3>Stage 2: Shortlisted</h3>
                    <div className="count">{getStageCount('stage2')}</div>
                </div>
                <div className={`stage-card ${currentStage === 'stage3' ? 'active' : ''}`}
                     onClick={() => setCurrentStage('stage3')}>
                    <h3>Stage 3: Accepted</h3>
                    <div className="count">{getStageCount('stage3')}</div>
                </div>
            </div>

            <div className="stage-content">
                <h2>{
                    currentStage === 'stage1' ? 'Stage 1: Need to Review' :
                    currentStage === 'stage2' ? 'Stage 2: Shortlisted' :
                    'Stage 3: Accepted'
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
                            <div 
                                key={application.id} 
                                id={`application-${application.id}`}
                                className={`application-card ${selectedApplication?.id === application.id ? 'highlighted' : ''}`}
                            >
                                <div className="card-header">
                                    <h3>{application.fullName}</h3>
                                    <span className={`status-badge ${application.stage}`}>
                                        {application.stage === 'stage1' ? 'PENDING' :
                                         application.stage === 'stage2' ? 'SHORTLISTED' :
                                         'ACCEPTED'}
                                    </span>
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
                                            <>
                                                <button 
                                                    onClick={() => handleStageChange(application.id, application.stage, 'stage2')}
                                                    className="stage-btn stage2-btn"
                                                >
                                                    Shortlist Application
                                                </button>
                                               
                                            </>
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