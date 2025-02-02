import React, { useState, useEffect, useContext } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseClient from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { Purchase } from '../types';
import StyledConnectButton from '../components/StyledConnectButton';

const AccountSettings: React.FC = () => {
  const [username, setUsername] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { user } = useContext(AuthContext);
  const { address } = useAccount();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // プロフィール取得
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUsername(profile.username || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPurchaseHistory = async () => {
      if (!user) return;
      setPurchasesLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('purchases')
          .select(`
            *,
            icos (
              name,
              symbol,
              price,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPurchases(data || []);
      } catch (error) {
        console.error('Error fetching purchase history:', error);
      } finally {
        setPurchasesLoading(false);
      }
    };

    fetchUserData();
    fetchPurchaseHistory();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !address) return;

    setLoading(true);
    setUpdateSuccess(false);
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          wallet_address: address
        });
      
      if (error) throw error;
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* プロフィール設定 */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary-900">プロフィール設定</h2>
              {updateSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                >
                  更新完了
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  ユーザー名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="ユーザー名を入力"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  ウォレット接続
                </label>
                <StyledConnectButton className="w-full" />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpdateProfile}
                disabled={loading || !address}
                className="btn-primary w-full flex justify-center items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>更新中...</span>
                  </>
                ) : (
                  '更新する'
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* 購入履歴 */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-primary-900 mb-6">購入履歴</h2>
            
            <AnimatePresence>
              {purchasesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: i * 0.1 }}
                      className="animate-pulse"
                    >
                      <div className="h-24 bg-primary-100 rounded-lg" />
                    </motion.div>
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <svg 
                    className="w-16 h-16 mx-auto text-primary-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-primary-600">購入履歴はありません</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase, index) => (
                    <motion.div
                      key={purchase.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="card p-4 border border-primary-200 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {purchase.icos.image_url && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${purchase.icos.image_url}`}
                              alt={purchase.icos.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <h3 className="font-medium text-primary-900 truncate">
                                {purchase.icos.name}
                              </h3>
                              <p className="text-sm text-primary-600">
                                {purchase.amount.toString()} {purchase.icos.symbol}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-primary-900">
                                {(Number(purchase.amount) * purchase.icos.price).toFixed(2)} USDT
                              </p>
                              <p className="text-sm text-primary-500">
                                {new Date(purchase.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;