import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import './FeeForm.css';

const FeeForm = ({ applicationId, onClose, onSubmitSuccess, isUpdating }) => {
  const [feeDetails, setFeeDetails] = useState({
    tuitionFee: '',
    admissionFee: '',
    libraryFee: '',
    laboratoryFee: '',
    otherFees: '',
    totalFee: '',
    dueDate: '',
    paymentStatus: 'Pending'
  });

  useEffect(() => {
    if (isUpdating) {
      fetchExistingFeeDetails();
    }
  }, [applicationId, isUpdating]);

  const fetchExistingFeeDetails = async () => {
    try {
      const applicationRef = doc(db, 'applications', applicationId);
      const applicationDoc = await getDoc(applicationRef);
      
      if (applicationDoc.exists()) {
        const data = applicationDoc.data();
        if (data.feeDetails) {
          setFeeDetails({
            ...data.feeDetails,
            dueDate: data.feeDetails.dueDate.split('T')[0], // Format date for input
            tuitionFee: data.feeDetails.tuitionFee.toString(),
            admissionFee: data.feeDetails.admissionFee.toString(),
            libraryFee: data.feeDetails.libraryFee.toString(),
            laboratoryFee: data.feeDetails.laboratoryFee.toString(),
            otherFees: data.feeDetails.otherFees.toString(),
            totalFee: data.feeDetails.totalFee.toString()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching fee details:', error);
      alert('Error loading fee details. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFeeDetails(prev => ({
      ...prev,
      [name]: value
    }));

    if (name.includes('Fee') || name === 'otherFees') {
      setTimeout(() => calculateTotal(), 0);
    }
  };

  const calculateTotal = () => {
    const fees = [
      'tuitionFee',
      'admissionFee',
      'libraryFee',
      'laboratoryFee',
      'otherFees'
    ];
    
    const total = fees.reduce((sum, fee) => {
      return sum + (Number(feeDetails[fee]) || 0);
    }, 0);

    setFeeDetails(prev => ({
      ...prev,
      totalFee: total.toString()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!applicationId) {
        throw new Error('Application ID is missing');
      }

      // Validate required fields
      if (!feeDetails.tuitionFee || !feeDetails.dueDate) {
        throw new Error('Please fill in all required fields');
      }

      const applicationRef = doc(db, 'applications', applicationId);
      
      // Get current application data
      const applicationDoc = await getDoc(applicationRef);
      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      // Prepare fee details with number conversion
      const updatedFeeDetails = {
        tuitionFee: Number(feeDetails.tuitionFee) || 0,
        admissionFee: Number(feeDetails.admissionFee) || 0,
        libraryFee: Number(feeDetails.libraryFee) || 0,
        laboratoryFee: Number(feeDetails.laboratoryFee) || 0,
        otherFees: Number(feeDetails.otherFees) || 0,
        totalFee: Number(feeDetails.totalFee) || 0,
        dueDate: feeDetails.dueDate,
        paymentStatus: feeDetails.paymentStatus || 'Pending'
      };

      // Update the document with both fee details and stage
      await updateDoc(applicationRef, {
        feeDetails: updatedFeeDetails,
        stage: 'stage2',
        lastUpdated: new Date()
      });
      
      console.log('Fee details and stage updated successfully');
      if (onSubmitSuccess) {
        await onSubmitSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error updating fee details:', error);
      alert('Error updating fee details: ' + error.message);
    }
  };

  return (
    <div className="fee-form-overlay">
      <div className="fee-form-container">
        <h2>{isUpdating ? 'Update Fee Structure' : 'Set Fee Structure'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="fee-form-group">
            <label>Tuition Fee (₹):</label>
            <input
              type="number"
              name="tuitionFee"
              value={feeDetails.tuitionFee}
              onChange={handleChange}
              required
              min="0"
            />
          </div>
          <div className="fee-form-group">
            <label>Admission Fee (₹):</label>
            <input
              type="number"
              name="admissionFee"
              value={feeDetails.admissionFee}
              onChange={handleChange}
              required
              min="0"
            />
          </div>
          <div className="fee-form-group">
            <label>Library Fee (₹):</label>
            <input
              type="number"
              name="libraryFee"
              value={feeDetails.libraryFee}
              onChange={handleChange}
              required
              min="0"
            />
          </div>
          <div className="fee-form-group">
            <label>Laboratory Fee (₹):</label>
            <input
              type="number"
              name="laboratoryFee"
              value={feeDetails.laboratoryFee}
              onChange={handleChange}
              required
              min="0"
            />
          </div>
          <div className="fee-form-group">
            <label>Other Fees (₹):</label>
            <input
              type="number"
              name="otherFees"
              value={feeDetails.otherFees}
              onChange={handleChange}
              min="0"
            />
          </div>
          <div className="fee-form-group">
            <label>Total Fee (₹):</label>
            <input
              type="number"
              name="totalFee"
              value={feeDetails.totalFee}
              readOnly
              className="readonly"
            />
          </div>
          <div className="fee-form-group">
            <label>Due Date:</label>
            <input
              type="date"
              name="dueDate"
              value={feeDetails.dueDate}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="fee-form-actions">
            <button type="submit" className="submit-btn">
              {isUpdating ? 'Update' : 'Submit'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeeForm; 