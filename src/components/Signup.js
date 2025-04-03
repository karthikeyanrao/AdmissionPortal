import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        college: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password should be at least 6 characters');
            setLoading(false);
            return;
        }

        // Validate college field for admin
        if (formData.role === 'admin' && !formData.college.trim()) {
            setError('College name is required for admin accounts');
            setLoading(false);
            return;
        }

        let userCredential = null;

        try {
            console.log('Starting user creation process...', { email: formData.email, role: formData.role });
            
            // Create user in Firebase Auth
            userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            ).catch(error => {
                console.error('Error in createUserWithEmailAndPassword:', error);
                throw error;
            });

            console.log('User created in Auth successfully:', userCredential.user.uid);

            // Check Firestore initialization
            if (!db) {
                console.error('Firestore not initialized');
                throw new Error('Firestore instance is not initialized');
            }

            // Prepare user data
            const userData = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                createdAt: serverTimestamp(),
                status: 'active',
                applications: []
            };

            // Add college field for admin
            if (formData.role === 'admin') {
                userData.college = formData.college;
            }

            try {
                // Create user document in Firestore
                const userRef = doc(db, 'users', userCredential.user.uid);
                await setDoc(userRef, userData);
                console.log('User data stored in Firestore successfully');

                // If role is student, create a profile document
                if (formData.role === 'student') {
                    console.log('Creating student profile...');
                    
                    const studentData = {
                        userId: userCredential.user.uid,
                        name: formData.name,
                        email: formData.email,
                        createdAt: serverTimestamp(),
                        status: 'incomplete',
                        personalInfo: {
                            phone: '',
                            address: '',
                            dateOfBirth: ''
                        },
                        education: {
                            currentSchool: '',
                            grade: '',
                            stream: ''
                        },
                        documents: [],
                        applicationStage: 0
                    };

                    const studentProfileRef = doc(db, 'studentProfiles', userCredential.user.uid);
                    await setDoc(studentProfileRef, studentData);
                    console.log('Student profile created successfully');
                }

                console.log('All data stored successfully, navigating...');
                
                // Navigate based on role
                if (formData.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/student/dashboard');
                }
            } catch (firestoreError) {
                console.error('Error storing data in Firestore:', firestoreError);
                // If Firestore storage fails, clean up the auth user
                if (userCredential && userCredential.user) {
                    try {
                        await userCredential.user.delete();
                        console.log('Cleaned up auth user after Firestore failure');
                    } catch (deleteError) {
                        console.error('Error cleaning up auth user:', deleteError);
                    }
                }
                throw firestoreError;
            }
        } catch (error) {
            console.error('Signup error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // More detailed error handling
            if (error.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please use a different email or try logging in.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (error.code === 'auth/operation-not-allowed') {
                setError('Email/password accounts are not enabled. Please contact support.');
            } else if (error.code === 'auth/weak-password') {
                setError('Please choose a stronger password. It should be at least 6 characters long.');
            } else if (error.message.includes('permission-denied')) {
                setError('Permission denied. Please check your account permissions.');
            } else if (error.message.includes('not-initialized') || !db) {
                setError('Database connection error. Please refresh the page and try again.');
            } else if (error.message.includes('network')) {
                setError('Network error. Please check your internet connection and try again.');
            } else {
                setError(`Error: ${error.message || 'An unexpected error occurred. Please try again.'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Create an Account</h2>
                <p className="auth-subtitle">Please fill in the details to sign up</p>

                <div className="role-selector">
                    <button
                        type="button"
                        className={`role-btn ${formData.role === 'student' ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, role: 'student', college: ''})}
                    >
                        Student
                    </button>
                    <button
                        type="button"
                        className={`role-btn ${formData.role === 'admin' ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, role: 'admin'})}
                    >
                        Admin
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                            className="form-input"
                        />
                    </div>

                    {formData.role === 'admin' && (
                        <div className="form-group">
                            <select
                                value={formData.college}
                                onChange={(e) => setFormData({...formData, college: e.target.value})}
                                required
                                className="form-input"
                            >
                                <option value="">Select College</option>
                                <option value="IIT Madras">IIT Madras</option>
                                <option value="IIT Bombay">IIT Bombay</option>
                                <option value="IIT Delhi">IIT Delhi</option>
                                <option value="AIIMS Delhi">AIIMS Delhi</option>
                                <option value="Amrita">Amrita</option>
                                <option value="NIT Trichy">NIT Trichy</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            required
                            className="form-input"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-switch">
                    Already have an account? 
                    <Link to="/login" className="auth-link">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;