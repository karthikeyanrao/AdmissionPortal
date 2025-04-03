import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import './ApplicationForm.css';

const ApplicationForm = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Personal Information
        fullName: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        email: auth.currentUser?.email || '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',

        // Academic Information
        lastSchool: '',
        schoolBoard: '',
        grade10Percentage: '',
        grade12Percentage: '',
        stream: '',
        achievements: '',

        // Course Preferences
        desiredCourse: '',
        specialization: '',
        collegePreference: '',
        whyJoin: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateStep = (stepNumber) => {
        const newErrors = {};
        
        if (stepNumber === 1) {
            if (!formData.fullName) newErrors.fullName = 'Full name is required';
            if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
            if (!formData.gender) newErrors.gender = 'Gender is required';
            if (!formData.phone) newErrors.phone = 'Phone number is required';
            if (!formData.address) newErrors.address = 'Address is required';
        }
        
        if (stepNumber === 2) {
            if (!formData.lastSchool) newErrors.lastSchool = 'Last school name is required';
            if (!formData.schoolBoard) newErrors.schoolBoard = 'School board is required';
            if (!formData.grade10Percentage) newErrors.grade10Percentage = '10th grade percentage is required';
            if (!formData.stream) newErrors.stream = 'Stream is required';
        }
        
        if (stepNumber === 3) {
            if (!formData.desiredCourse) newErrors.desiredCourse = 'Desired course is required';
            if (!formData.collegePreference) newErrors.collegePreference = 'College preference is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(step)) return;

        setIsSubmitting(true);
        try {
            const applicationData = {
                ...formData,
                studentId: auth.currentUser.uid,
                status: 'under_review',
                appliedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                collegeName: formData.collegePreference,
                course: formData.desiredCourse
            };

            const docRef = await addDoc(collection(db, 'applications'), applicationData);
            console.log('Application submitted successfully with ID:', docRef.id);
            onSuccess(docRef.id);
            onClose();
        } catch (error) {
            console.error('Error submitting application:', error);
            setErrors({ submit: 'Failed to submit application. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="application-form-overlay">
            <div className="application-form-container">
                <button className="close-btn" onClick={onClose}>&times;</button>
                
                <div className="form-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>Personal</div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>Academic</div>
                    <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>Course</div>
                </div>

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div className="form-step">
                            <h2>Personal Information</h2>
                            
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className={errors.fullName ? 'error' : ''}
                                />
                                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date of Birth *</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleChange}
                                        className={errors.dateOfBirth ? 'error' : ''}
                                    />
                                    {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Gender *</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className={errors.gender ? 'error' : ''}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.gender && <span className="error-message">{errors.gender}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={errors.phone ? 'error' : ''}
                                    />
                                    {errors.phone && <span className="error-message">{errors.phone}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className={errors.address ? 'error' : ''}
                                />
                                {errors.address && <span className="error-message">{errors.address}</span>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Pincode</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="form-step">
                            <h2>Academic Information</h2>
                            
                            <div className="form-group">
                                <label>Last School Attended *</label>
                                <input
                                    type="text"
                                    name="lastSchool"
                                    value={formData.lastSchool}
                                    onChange={handleChange}
                                    className={errors.lastSchool ? 'error' : ''}
                                />
                                {errors.lastSchool && <span className="error-message">{errors.lastSchool}</span>}
                            </div>

                            <div className="form-group">
                                <label>School Board *</label>
                                <select
                                    name="schoolBoard"
                                    value={formData.schoolBoard}
                                    onChange={handleChange}
                                    className={errors.schoolBoard ? 'error' : ''}
                                >
                                    <option value="">Select Board</option>
                                    <option value="CBSE">CBSE</option>
                                    <option value="ICSE">ICSE</option>
                                    <option value="State">State Board</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors.schoolBoard && <span className="error-message">{errors.schoolBoard}</span>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>10th Grade Percentage *</label>
                                    <input
                                        type="number"
                                        name="grade10Percentage"
                                        value={formData.grade10Percentage}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                        className={errors.grade10Percentage ? 'error' : ''}
                                    />
                                    {errors.grade10Percentage && <span className="error-message">{errors.grade10Percentage}</span>}
                                </div>

                                <div className="form-group">
                                    <label>12th Grade Percentage</label>
                                    <input
                                        type="number"
                                        name="grade12Percentage"
                                        value={formData.grade12Percentage}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Stream *</label>
                                <select
                                    name="stream"
                                    value={formData.stream}
                                    onChange={handleChange}
                                    className={errors.stream ? 'error' : ''}
                                >
                                    <option value="">Select Stream</option>
                                    <option value="Biology">Biology</option>
                                    <option value="Commerce">Commerce</option>
                                    <option value="CS">CS</option>
                                </select>
                                {errors.stream && <span className="error-message">{errors.stream}</span>}
                            </div>

                            <div className="form-group">
                                <label>Academic Achievements</label>
                                <textarea
                                    name="achievements"
                                    value={formData.achievements}
                                    onChange={handleChange}
                                    placeholder="List your academic achievements, awards, etc."
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="form-step">
                            <h2>Course Preferences</h2>
                            
                            <div className="form-group">
                                <label>Desired Course *</label>
                                <select
                                    name="desiredCourse"
                                    value={formData.desiredCourse}
                                    onChange={handleChange}
                                    className={errors.desiredCourse ? 'error' : ''}
                                >
                                    <option value="">Select Course</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Medical">Medical</option>
                                    <option value="Arts">Arts</option>
                                    
                                </select>
                                {errors.desiredCourse && <span className="error-message">{errors.desiredCourse}</span>}
                            </div>

                            <div className="form-group">
                                <label>Specialization</label>
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleChange}
                                    placeholder="e.g., Computer Science, Biology, Economics"
                                />
                            </div>

                            <div className="form-group">
                                <label>College Preference *</label>
                                <select
                                    name="collegePreference"
                                    value={formData.collegePreference}
                                    onChange={handleChange}
                                    className={errors.collegePreference ? 'error' : ''}
                                >
                                    <option value="">Select College</option>
                                    <option value="IIT Madras">IIT Madras</option>
                                    <option value="IIT Bombay">IIT Bombay</option>
                                    <option value="IIT Delhi">IIT Delhi</option>
                                    <option value="AIIMS Delhi">AIIMS Delhi</option>
                                    <option value="Amrita">Amrita</option>
                                    <option value="NIT Trichy">NIT Trichy</option>
                                </select>
                                {errors.collegePreference && <span className="error-message">{errors.collegePreference}</span>}
                            </div>

                            <div className="form-group">
                                <label>Why do you want to join this course?</label>
                                <textarea
                                    name="whyJoin"
                                    value={formData.whyJoin}
                                    onChange={handleChange}
                                    placeholder="Tell us about your motivation and career goals..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-navigation">
                        {step > 1 && (
                            <button type="button" onClick={handleBack} className="back-btn">
                                Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button type="button" onClick={handleNext} className="next-btn">
                                Next
                            </button>
                        ) : (
                            <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        )}
                    </div>

                    {errors.submit && (
                        <div className="submit-error">
                            {errors.submit}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ApplicationForm;