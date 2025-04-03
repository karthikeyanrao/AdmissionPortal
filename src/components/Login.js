import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'student'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Sign in with Firebase
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            
            if (!userDoc.exists()) {
                throw new Error('User data not found');
            }

            const userData = userDoc.data();

            // Verify user role
            if (userData.role !== formData.role) {
                throw new Error('Invalid role selected');
            }

            // Check if user is active
            if (userData.status !== 'active') {
                throw new Error('Account is not active');
            }

            // Navigate based on role
            if (userData.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Invalid email or password';
            
            if (error.message === 'Invalid role selected') {
                errorMessage = 'Invalid role selected';
            } else if (error.message === 'User data not found') {
                errorMessage = 'User account not found';
            } else if (error.message === 'Account is not active') {
                errorMessage = 'Your account is not active';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Login to Admission Portal</h2>
                <p className="auth-subtitle">Please sign in to continue</p>

                <div className="role-selector">
                    <button
                        type="button"
                        className={`role-btn ${formData.role === 'student' ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, role: 'student'})}
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
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                            className="form-input"
                        />
                    </div>
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

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="auth-switch">
                    Don't have an account? 
                    <Link to="/signup" className="auth-link">Sign Up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;