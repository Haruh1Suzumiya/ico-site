import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAccount, useContractWrite } from 'wagmi';
import { parseEther } from 'viem';
import supabaseClient from '../lib/supabaseClient';
import { ICOData } from '../types';
import { ERC20_ABI, ICO_ABI } from '../contracts/abis';
import StyledConnectButton from '../components/StyledConnectButton';
import { AuthContext } from '../context/AuthContext';

const ICODetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ico, setIco] = useState<ICOData | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [icoStatus, setIcoStatus] = useState<'upcoming' | 'active' | 'ended'>('upcoming');
  const { address } = useAccount();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchICODetails = async () => {
      if (!id) return;
      const { data, error } = await supabaseClient
        .from('icos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching ICO details:', error);
        return;
      }

      setIco(data as ICOData);
      
      // ICOのステータスを判定
      const now = new Date().getTime();
      const startTime = new Date(data.start_date).getTime();
      const endTime = new Date(data.end_date).getTime();

      if (now < startTime) {
        setIcoStatus('upcoming');
      } else if (now > endTime) {
        setIcoStatus('ended');
      } else {
        setIcoStatus('active');
      }
    };

    fetchICODetails();
  }, [id]);

  const { write: approveUSDT } = useContractWrite({
    address: import.meta.env.VITE_USDT_CONTRACT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve'
  });

  const { write: purchaseTokens } = useContractWrite({
    address: import.meta.env.VITE_ICO_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'purchaseTokens'
  });

  const handlePurchase = async () => {
    if (!ico || !amount || !address) return;

    setLoading(true);
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('wallet_address')
        .eq('id', user?.id)
        .single();

      if (!profile?.wallet_address) {
        navigate('/account');
        return;
      }

      const usdtAmount = parseEther(amount);
      await approveUSDT({
        args: [import.meta.env.VITE_ICO_CONTRACT_ADDRESS, BigInt(usdtAmount)]
      });

      await purchaseTokens({
        args: [BigInt(ico.contract_id), BigInt(usdtAmount)]
      });

      await supabaseClient.from('purchases').insert([
        {
          user_id: user?.id,
          ico_id: ico.id,
          amount: BigInt(Math.floor(parseFloat(amount))),
          price_per_token: BigInt(ico.price)
        }
      ]);

      navigate('/purchase/complete');
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (icoStatus === 'upcoming') {
      return '開始前のため購入できません';
    }
    if (icoStatus === 'ended') {
      return '終了済みのため購入できません';
    }
    if (!address) {
      return 'ウォレットを接続してください';
    }
    if (!amount) {
      return '数量を入力してください';
    }
    return '購入する';
  };

  const getStatusBadge = () => {
    switch (icoStatus) {
      case 'upcoming':
        return (
          <span className="px-4 py-2 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
            開始予定
          </span>
        );
      case 'ended':
        return (
          <span className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
            終了
          </span>
        );
      case 'active':
        return (
          <span className="px-4 py-2 text-sm font-medium bg-green-100 text-green-800 rounded-full">
            実施中
          </span>
        );
    }
  };

  if (!ico) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* ヘッダー画像 */}
      <div className="relative h-64 md:h-80 mb-8 rounded-xl overflow-hidden">
        {ico.image_url && (
          <>
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.image_url}`}
              alt={`${ico.name} header`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        )}
        
        {/* プロジェクトアイコンとタイトル */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-lg">
              {ico.image_url && (
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.image_url}`}
                  alt={`${ico.name} icon`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{ico.name}</h1>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  {ico.symbol}
                </span>
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {/* プロジェクト詳細 */}
        <div className="md:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-primary-900 mb-4">プロジェクト詳細</h2>
            <div className="prose prose-primary max-w-none">
              {ico.description.split('\n').map((paragraph, index) => (
                <p key={index} className="text-primary-700 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-primary-900 mb-4">トークン情報</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-primary-600">総供給量</p>
                <p className="font-medium text-primary-900">{ico.total_supply.toLocaleString()} {ico.symbol}</p>
              </div>
              <div>
                <p className="text-primary-600">価格</p>
                <p className="font-medium text-primary-900">{ico.price} USDT</p>
              </div>
              <div>
                <p className="text-primary-600">開始日</p>
                <p className="font-medium text-primary-900">{new Date(ico.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-primary-600">終了日</p>
                <p className="font-medium text-primary-900">{new Date(ico.end_date).toLocaleDateString()}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 購入フォーム */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:sticky md:top-8 h-fit"
        >
          <div className="card p-6 space-y-6">
            <h2 className="text-xl font-bold text-primary-900">トークン購入</h2>
            
            <StyledConnectButton className="w-full" />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  購入数量
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  placeholder="0"
                  disabled={!address || loading || icoStatus !== 'active'}
                />
                {amount && (
                  <p className="mt-2 text-sm text-primary-600">
                    合計: {(parseFloat(amount) * (ico?.price || 0)).toFixed(2)} USDT
                  </p>
                )}
              </div>

              <button
                onClick={handlePurchase}
                disabled={!address || !amount || loading || icoStatus !== 'active'}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </span>
                ) : (
                  getButtonText()
                )}
              </button>
            </div>

            {icoStatus !== 'active' && (
              <div className={`p-4 rounded-lg ${
                icoStatus === 'upcoming' 
                  ? 'bg-yellow-50 text-yellow-800'
                  : 'bg-gray-50 text-gray-800'
              }`}>
                {icoStatus === 'upcoming' 
                  ? '開始までお待ちください'
                  : 'このICOは終了しました'
                }
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ICODetail;