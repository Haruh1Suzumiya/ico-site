import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import ICOCreatePage from './ICOCreatePage';
import ICOControlPage from './ICOControlPage';
import { motion } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">管理者ダッシュボード</h1>
      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          <NavLink
            to="create"
            className={({ isActive }) =>
              isActive ? "pb-2 border-b-2 border-blue-600 text-blue-600" : "pb-2 text-gray-600 hover:text-blue-600"
            }
          >
            ICO作成
          </NavLink>
          <NavLink
            to="control"
            className={({ isActive }) =>
              isActive ? "pb-2 border-b-2 border-blue-600 text-blue-600" : "pb-2 text-gray-600 hover:text-blue-600"
            }
          >
            ICO制御
          </NavLink>
        </nav>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="create" replace />} />
          <Route path="create" element={<ICOCreatePage />} />
          <Route path="control" element={<ICOControlPage />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;