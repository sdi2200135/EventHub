// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar, Footer } from './components/common';
import './App.css';

import HomePage from './pages/HomePage';
import SignIn from './pages/auth/SignIn';
import ForgotPwd from './pages/auth/ForgotPwd';
import SignUp from './pages/auth/SignUp';
import EventsPage from './pages/events/EventsPage';
import EventDetails from './pages/events/EventDetails';
import BookingPage from './pages/events/BookingPage';
import ProfilePage from './pages/profile/ProfilePage';
import EditProfile from './pages/profile/EditProfile';
import MessageView from './pages/profile/common/MessageView';
import NewMessage from './pages/profile/common/NewMessage';
import CreateEvent from './pages/profile/organizer/CreateEvent';
import EventDetailsOrganizer from './pages/profile/organizer/EventDetailsOrganizer';
import EditEvent from './pages/profile/organizer/EditEvent';
import ReservationsDetails from './pages/profile/organizer/ReservationsDetails';

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
              <Route path="/profile/messages/new" element={<NewMessage />} />
              <Route path="/profile/messages/:id" element={<MessageView />} />
              <Route path="/profile/events/new" element={<CreateEvent />} />
              <Route path="/profile/events/edit/:id" element={<EditEvent />} />
              <Route path="/profile/events/:id" element={<EventDetailsOrganizer />} />
              <Route path="/profile/reservations/:id" element={<ReservationsDetails />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;