// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar, Footer } from './components/common';
import './App.css';

import HomePage from './pages/HomePage';
import SignIn from './pages/SignIn';
import ForgotPwd from './pages/ForgotPwd';
import SignUp from './pages/SignUp';
import EventsPage from './pages/EventsPage';
import EventDetails from './pages/EventDetails';
import BookingPage from './pages/BookingPage';
import ProfilePage from './pages/ProfilePage';
import EditProfile from './pages/EditProfile';
import MessageView from './pages/MessageView';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-wrapper">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signin/forgot-password" element={<ForgotPwd />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/details/:id" element={<EventDetails />} />
              <Route path="/events/details/:id/booking" element={<BookingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/profile/message/:id" element={<MessageView />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;