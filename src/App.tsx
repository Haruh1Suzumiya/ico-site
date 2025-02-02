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

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isHoveringToggle, setIsHoveringToggle] = useState(false);
  const [shouldFadeToggle, setShouldFadeToggle] = useState(false);

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

    handleResize(); // 初期化時に実行
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldFadeToggle(true);
    }, 3000); // 3秒後に透明度を下げる

    return () => clearTimeout(timer);
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
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .maybeSingle();
    
    setIsAdmin(!!data);
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
          {/* サイドバーとトグルボタンのコンテナ */}
          <motion.div
            initial={sidebarContainerVariants.closed}
            animate={sidebarOpen ? "open" : "closed"}
            variants={sidebarContainerVariants}
            className="fixed left-0 top-0 bottom-0 z-40"
          >
            {/* トグルボタン */}
            <motion.button
              onClick={toggleSidebar}
              onMouseEnter={() => setIsHoveringToggle(true)}
              onMouseLeave={() => setIsHoveringToggle(false)}
              className="absolute -right-10 top-4 p-2 rounded-lg bg-white shadow-lg transition-opacity duration-300"
              animate={{ 
                opacity: (!shouldFadeToggle || isHoveringToggle || !sidebarOpen) ? 1 : 0.3
              }}
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

            {/* サイドバー */}
            <div className="w-64 h-full bg-white shadow-lg overflow-y-auto">
              <div className="p-6">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-primary-900">ICO Platform</h1>
                </div>
                <div className="space-y-4">
                  <Link
                    to="/dashboard"
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className="flex items-center space-x-2 nav-link w-full transition-transform hover:translate-x-1"
                  >
                    <span>📊</span>
                    <span>ダッシュボード</span>
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className="flex items-center space-x-2 nav-link w-full transition-transform hover:translate-x-1"
                  >
                    <span>⚙️</span>
                    <span>アカウント設定</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className="flex items-center space-x-2 nav-link w-full transition-transform hover:translate-x-1"
                    >
                      <span>👑</span>
                      <span>管理者ページ</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      supabaseClient.auth.signOut();
                      isMobile && setSidebarOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full py-2 px-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 hover:translate-x-1"
                  >
                    <span>🚪</span>
                    <span>ログアウト</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* オーバーレイ（モバイル時のみ表示） */}
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

          {/* メインコンテンツ */}
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