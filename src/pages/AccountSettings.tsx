import React, { useState, useEffect, useContext } from 'react';
import { useAccount } from 'wagmi';
import supabaseClient from '../lib/supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { Purchase } from '../types';
import StyledConnectButton from '../components/StyledConnectButton';

const AccountSettings: React.FC = () => {
  const [username, setUsername] = useState('');
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // エラーコード PGRST116 は「該当行が存在しない」場合に発生
        if (error.code === 'PGRST116') {
          setUsername(''); // 初期値
        } else {
          console.error('プロフィール取得エラー:', error);
        }
      } else if (data) {
        setUsername(data.username || '');
      }
    };

    const fetchPurchases = async () => {
      if (!user) return;

      const { data, error } = await supabaseClient
        .from('purchases')
        .select(
          `*, icos (
            name,
            symbol,
            price
          )`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('購入履歴取得エラー:', error);
      } else if (data) {
        setPurchases(data);
      }
    };

    fetchUserProfile();
    fetchPurchases();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !address) return;

    setLoading(true);
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          wallet_address: address
        });
      if (error) throw error;
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">アカウント設定</h1>
      <div className="space-y-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">プロフィール設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ユーザー名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ウォレット接続</label>
              <StyledConnectButton />
            </div>
            <button
              onClick={handleUpdateProfile}
              disabled={loading || !address}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {loading ? '更新中...' : '更新する'}
            </button>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">購入履歴</h2>
          <div className="space-y-4">
            {purchases.length === 0 && (
              <p className="text-gray-500">購入履歴はありません</p>
            )}
            {purchases.map((purchase) => (
              <div key={purchase.id} className="border-b pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h3 className="font-medium">{purchase.icos.name}</h3>
                    <p className="text-sm text-gray-600">
                      {purchase.amount.toString()} {purchase.icos.symbol}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <p className="font-medium">
                      {(purchase.amount * BigInt(purchase.icos.price)).toString()} USDT
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;