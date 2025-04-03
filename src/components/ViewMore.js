import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './ViewMore.css';

const ViewMore = ({ application, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [fullApplicationData, setFullApplicationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFullApplicationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the complete application document
        const applicationRef = doc(db, 'applications', application.id);
        const applicationDoc = await getDoc(applicationRef);
        
        if (!applicationDoc.exists()) {
          setError('Application not found');
          return;
        }

        const data = {
          ...applicationDoc.data(),
          id: applicationDoc.id
        };

        console.log('Fetched application data:', data);
        setFullApplicationData(data);
      } catch (err) {
        console.error('Error fetching application details:', err);
        setError('Failed to load application details');
      } finally {
        setLoading(false);
      }
    };

    fetchFullApplicationData();
  }, [application.id]);

  const formatDate = (date) => {
    if (!date) return 'Not specified';
    try {
      // If it's a Firestore Timestamp
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      // If it's already a Date object or string
      return new Date(date).toLocaleDateString();
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="view-more-overlay">
        <div className="view-more-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-more-overlay">
        <div className="view-more-container">
          <div className="error-message">{error}</div>
          <button className="close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const data = fullApplicationData || application;

  return (
    <div className="view-more-overlay">
      <div className="view-more-container">
        <h2>Application Details</h2>
        <div className="view-more-content">
          <div className="detail-section">
            <h3>Personal Information</h3>
            <p><strong>Full Name:</strong> {data.studentName || data.fullName || 'Not specified'}</p>
            <p><strong>Gender:</strong> {data.gender || 'Not specified'}</p>
            <p><strong>Date of Birth:</strong> {formatDate(data.dateOfBirth)}</p>
            <p><strong>Phone Number:</strong> {data.phone || 'Not specified'}</p>
            <p><strong>Email:</strong> {data.email || 'Not specified'}</p>
            <p><strong>Address:</strong> {data.address || 'Not specified'}</p>
            <p><strong>City:</strong> {data.city || 'Not specified'}</p>
            <p><strong>State:</strong> {data.state || 'Not specified'}</p>
          </div>

          <div className="detail-section">
            <h3>Academic Details</h3>
            <p><strong>10th Marks:</strong> {data.grade10Percentage || 'Not specified'}</p>
            <p><strong>12th Marks:</strong> {data.grade12Percentage || 'Not specified'}</p>
            <p><strong>Course Applied:</strong> {data.specialization || 'Not specified'}</p>
            <p><strong>Previous Institution:</strong> {data.lastSchool || 'Not specified'}</p>
            <p><strong>College:</strong> {data.collegeName || 'Not specified'}</p>
            {data.achievements && (
              <div className="achievements-section">
                <strong>Achievements:</strong>
                <div className="achievements-text">{data.achievements}</div>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Documents Status</h3>
            <p><strong>10th Certificate:</strong> {data.documents?.marksheet10 ? 'Submitted' : 'Not Submitted'}</p>
            <p><strong>12th Certificate:</strong> {data.documents?.marksheet12 ? 'Submitted' : 'Not Submitted'}</p>
            <p><strong>ID Proof:</strong> {data.documents?.idProof ? 'Submitted' : 'Not Submitted'}</p>
            {data.documents?.other && (
              <p><strong>Other Documents:</strong> Submitted</p>
            )}
          </div>

          {data.feeDetails && (
            <div className="detail-section">
              <h3>Fee Structure</h3>
              <p><strong>Tuition Fee:</strong> {formatCurrency(data.feeDetails.tuitionFee)}</p>
              <p><strong>Admission Fee:</strong> {formatCurrency(data.feeDetails.admissionFee)}</p>
              <p><strong>Library Fee:</strong> {formatCurrency(data.feeDetails.libraryFee)}</p>
              <p><strong>Laboratory Fee:</strong> {formatCurrency(data.feeDetails.laboratoryFee)}</p>
              <p><strong>Other Fees:</strong> {formatCurrency(data.feeDetails.otherFees)}</p>
              <p><strong>Total Fee:</strong> {formatCurrency(data.feeDetails.totalFee)}</p>
              <p><strong>Due Date:</strong> {formatDate(data.feeDetails.dueDate)}</p>
              <p><strong>Payment Status:</strong> {data.feeDetails.paymentStatus || 'Pending'}</p>
            </div>
          )}

          <div className="detail-section">
            <h3>Application Status</h3>
            <p><strong>Current Stage:</strong> {data.stage || 'Under Review'}</p>
            <p><strong>Applied Date:</strong> {formatDate(data.appliedDate)}</p>
            <p><strong>Last Updated:</strong> {formatDate(data.lastUpdated)}</p>
            {data.comments && (
              <div className="comments-section">
                <strong>Admin Comments:</strong>
                <div className="comments-text">{data.comments}</div>
              </div>
            )}
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ViewMore; 