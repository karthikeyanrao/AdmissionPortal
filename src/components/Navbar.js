import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { FiUser, FiLogOut, FiChevronDown, FiPlusCircle } from 'react-icons/fi';
import './Navbar.css';

const Navbar = ({ onCreateApplication }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();
    const user = auth.currentUser;

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <h1>Admission Portal</h1>
            </div>
            
            <div className="navbar-actions">
                <button 
                    className="create-application-btn" 
                    onClick={onCreateApplication}
                >
                    <FiPlusCircle className="btn-icon" />
                    Create Application
                </button>
                
                <div className="navbar-profile" onClick={() => setShowDropdown(!showDropdown)}>
                    <div className="profile-info">
                        <FiUser className="profile-icon" />
                        <span className="username">{user?.email || 'User'}</span>
                        <FiChevronDown className={`dropdown-icon ${showDropdown ? 'open' : ''}`} />
                    </div>
                    
                    {showDropdown && (
                        <div className="profile-dropdown">
                            <button className="dropdown-item" onClick={() => navigate('/profile')}>
                                <FiUser />
                                <span>Profile</span>
                            </button>
                            <button className="dropdown-item" onClick={handleLogout}>
                                <FiLogOut />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
