import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import Profile from './components/Profile';

import Navbar from './components/Navbar';
import './App.css';

function App() {
    return (
        <Router>
            <Routes>
                {/* Default route redirects to login */}
                <Route path="/" element={<Navigate to="/login" />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/navbar" element={<Navbar />} />
                {/* Dashboard routes */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/profile" element={<Profile />} />
            
                {/* Catch all route - redirects to login */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;