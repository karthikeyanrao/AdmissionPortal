import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FiUser, FiPhone, FiMapPin, FiCalendar, FiMail, FiSave } from 'react-icons/fi';
import Navbar from './Navbar';
import './Profile.css';

const Profile = () => {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        city: '',
        state: '',
        pincode: '',
        address: '',
        gender: '',
        fatherName: '',
        motherName: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            const profileRef = doc(db, 'studentProfiles', user.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                setProfile({
                    ...profileSnap.data(),
                    email: user.email,
                    dateOfBirth: profileSnap.data().dateOfBirth || ''
                });
            } else {
                setProfile(prev => ({ ...prev, email: user.email }));
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setMessage({ text: 'Error loading profile', type: 'error' });
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No authenticated user');

            const profileRef = doc(db, 'studentProfiles', user.uid);
            await setDoc(profileRef, {
                ...profile,
                updatedAt: new Date(),
            }, { merge: true });

            setMessage({ text: 'Profile updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ text: 'Error updating profile', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="loading-spinner"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="profile-wrapper">
            <Navbar />
            <div className="profile-container">
                <div className="profile-header">
                    <h1>My Profile</h1>
                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                <FiUser className="field-icon" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={profile.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiMail className="field-icon" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="disabled"
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiPhone className="field-icon" />
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={profile.phoneNumber}
                                onChange={handleChange}
                                placeholder="Enter your phone number"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiCalendar className="field-icon" />
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={profile.dateOfBirth}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiUser className="field-icon" />
                                Gender
                            </label>
                            <select
                                name="gender"
                                value={profile.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                <FiUser className="field-icon" />
                                Father's Name
                            </label>
                            <input
                                type="text"
                                name="fatherName"
                                value={profile.fatherName}
                                onChange={handleChange}
                                placeholder="Enter father's name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiUser className="field-icon" />
                                Mother's Name
                            </label>
                            <input
                                type="text"
                                name="motherName"
                                value={profile.motherName}
                                onChange={handleChange}
                                placeholder="Enter mother's name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiMapPin className="field-icon" />
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={profile.city}
                                onChange={handleChange}
                                placeholder="Enter your city"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiMapPin className="field-icon" />
                                State
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={profile.state}
                                onChange={handleChange}
                                placeholder="Enter your state"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FiMapPin className="field-icon" />
                                PIN Code
                            </label>
                            <input
                                type="text"
                                name="pincode"
                                value={profile.pincode}
                                onChange={handleChange}
                                placeholder="Enter PIN code"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label>
                            <FiMapPin className="field-icon" />
                            Address
                        </label>
                        <textarea
                            name="address"
                            value={profile.address}
                            onChange={handleChange}
                            placeholder="Enter your full address"
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="save-btn" disabled={saving}>
                            <FiSave className="btn-icon" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile; 