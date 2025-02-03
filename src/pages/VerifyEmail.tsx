import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="card p-8 space-y-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center"
          >
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </motion.div>

          <h2 className="text-2xl font-bold text-primary-900">メールを確認してください</h2>
          
          <p className="text-primary-600">
            {email} 宛に認証メールを送信しました。<br />
            メール内のリンクをクリックして登録を完了してください。
          </p>

          <div className="pt-4">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center justify-center"
            >
              ログインページへ戻る
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;