import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Link } from 'react-router-dom';
import { WagmiConfig, createConfig } from 'wagmi';
import { configureChains } from 'wagmi';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseClient from './lib/supabaseClient';
import { AuthContext } from './context/AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

const { chains, publicClient } = configureChains(
  [sepolia],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: chain.id === sepolia.id ? "https://ethereum-sepolia-rpc.publicnode.com" : "",
      }),
    })
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'ICO Platform',
  projectId,
  chains,
});

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

// SVGアイコンコンポーネント
const DashboardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AdminIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(newIsMobile);
      if (newIsMobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        }
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabaseClient
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setIsLogoutModalOpen(false);
    setSidebarOpen(false);
  };

  const sidebarContainerVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {user ? (
        <div className="min-h-screen bg-primary-50">
          <motion.div
            initial={sidebarContainerVariants.closed}
            animate={sidebarOpen ? "open" : "closed"}
            variants={sidebarContainerVariants}
            className="fixed left-0 top-0 bottom-0 z-40"
          >
            <motion.button
              onClick={toggleSidebar}
              className="absolute -right-10 top-4 p-2 rounded-lg bg-white shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg 
                className="w-6 h-6 text-primary-900" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                )}
              </svg>
            </motion.button>

            <div className="w-64 h-full bg-white shadow-lg flex flex-col">
              <div className="flex-1 p-6">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-primary-900">ICO Platform</h1>
                </div>
                <div className="space-y-4">
                  <Link
                    to="/dashboard"
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className="flex items-center space-x-3 nav-link w-full transition-transform hover:translate-x-1"
                  >
                    <DashboardIcon />
                    <span>ダッシュボード</span>
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className="flex items-center space-x-3 nav-link w-full transition-transform hover:translate-x-1"
                  >
                    <SettingsIcon />
                    <span>アカウント設定</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className="flex items-center space-x-3 nav-link w-full transition-transform hover:translate-x-1"
                    >
                      <AdminIcon />
                      <span>管理者ページ</span>
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-primary-100">
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="flex items-center space-x-3 w-full py-2 px-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 hover:translate-x-1"
                >
                  <LogoutIcon />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {sidebarOpen && isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black z-30 lg:hidden"
              />
            )}
          </AnimatePresence>

          <motion.main
            initial={false}
            animate={{
              marginLeft: sidebarOpen ? (isMobile ? 0 : '16rem') : 0,
              marginRight: 0
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="min-h-screen p-4 md:p-8"
          >
            <div className="container mx-auto">
              <AnimatedRoutes isAuthenticated={!!user} isAdmin={isAdmin} />
            </div>
          </motion.main>

          <LogoutConfirmModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={handleLogout}
          />
        </div>
      ) : (
        <AnimatedRoutes isAuthenticated={false} isAdmin={false} />
      )}
    </AuthContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <Router>
          <AppContent />
        </Router>
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default App;