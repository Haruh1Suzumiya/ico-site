import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Link } from 'react-router-dom';
import { WagmiConfig, createConfig } from 'wagmi';
import { configureChains } from 'wagmi';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { RainbowKitProvider, getDefaultWallets, darkTheme } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import supabaseClient from './lib/supabaseClient';
import { AuthContext } from './context/AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

// Public RPC エンドポイントを利用（https://ethereum-sepolia-rpc.publicnode.com）
const { chains, publicClient } = configureChains(
  [sepolia],
  [
    jsonRpcProvider({
      rpc: (chain: { id: number }) => {
        if (chain.id === sepolia.id) {
          return { http: "https://ethereum-sepolia-rpc.publicnode.com" };
        }
        return null;
      }
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const { data, error } = await supabaseClient
      .from('admins')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      setIsAdmin(true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {user ? (
        <div className="flex min-h-screen">
          {/* モバイル用：上部バーとハンバーガーメニュー */}
          <div className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">ICO Platform</h2>
            <button onClick={() => setSidebarOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* モバイル用：サイドバー */}
          <div className={`fixed z-30 inset-0 flex ${sidebarOpen ? "" : "hidden"} md:hidden`}>
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-blue-600 p-6 text-white">
              <button onClick={() => setSidebarOpen(false)} className="absolute top-2 right-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-8">ICO Platform</h2>
              <nav className="space-y-4">
                <Link onClick={() => setSidebarOpen(false)} to="/dashboard" className="block p-2 rounded hover:bg-blue-700 transition-colors">
                  ダッシュボード
                </Link>
                <Link onClick={() => setSidebarOpen(false)} to="/account" className="block p-2 rounded hover:bg-blue-700 transition-colors">
                  アカウント設定
                </Link>
                {isAdmin && (
                  <Link onClick={() => setSidebarOpen(false)} to="/admin" className="block p-2 rounded hover:bg-blue-700 transition-colors">
                    管理者ページ
                  </Link>
                )}
                <button
                  onClick={() => supabaseClient.auth.signOut()}
                  className="w-full text-left p-2 rounded hover:bg-blue-700 transition-colors"
                >
                  ログアウト
                </button>
              </nav>
            </div>
          </div>
          {/* 中～大画面用：サイドバー */}
          <aside className="hidden md:block w-64 bg-blue-600 text-white p-6 shadow-lg fixed h-full">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">ICO Platform</h2>
            </div>
            <nav className="space-y-4">
              <Link to="/dashboard" className="block p-2 rounded hover:bg-blue-700 transition-colors">
                ダッシュボード
              </Link>
              <Link to="/account" className="block p-2 rounded hover:bg-blue-700 transition-colors">
                アカウント設定
              </Link>
              {isAdmin && (
                <Link to="/admin" className="block p-2 rounded hover:bg-blue-700 transition-colors">
                  管理者ページ
                </Link>
              )}
              <button onClick={() => supabaseClient.auth.signOut()} className="w-full text-left p-2 rounded hover:bg-blue-700 transition-colors">
                ログアウト
              </button>
            </nav>
          </aside>
          {/* メインコンテンツ */}
          <main className="ml-0 md:ml-64 flex-1 p-4 bg-gray-50 min-h-screen">
            <AnimatedRoutes isAuthenticated={!!user} isAdmin={isAdmin} />
          </main>
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
      <RainbowKitProvider chains={chains} theme={darkTheme()}>
        <Router>
          <AppContent />
        </Router>
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default App;