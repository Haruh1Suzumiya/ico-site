import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from '../pages/Dashboard';
import ICODetail from '../pages/ICODetail';
import AccountSettings from '../pages/AccountSettings';
import PurchaseComplete from '../pages/PurchaseComplete';
import AdminDashboard from '../pages/AdminDashboard';
import Signup from '../pages/Signup';
import Login from '../pages/Login';
import VerifyEmail from '../pages/VerifyEmail';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
};

interface AnimatedRoutesProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AnimatedRoutes: React.FC<AnimatedRoutesProps> = ({ isAuthenticated, isAdmin }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {isAuthenticated ? (
          <Routes location={location}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ico/:id" element={<ICODetail />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/purchase/complete" element={<PurchaseComplete />} />
            {isAdmin && <Route path="/admin/*" element={<AdminDashboard />} />}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        ) : (
          <Routes location={location}>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="*" element={<Login />} />
          </Routes>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;