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
import NewMessage from './pages/NewMessage';
// import MyEvents from './pages/MyEvents';
import CreateEvent from './pages/CreateEvent';
import EventDetailsOrganizer from './pages/EventDetailsOrganizer';
import EditEvent from './pages/EditEvent';

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
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;