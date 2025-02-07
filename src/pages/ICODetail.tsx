import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAccount, useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import ReactMarkdown from 'react-markdown';
import supabaseClient from '../lib/supabaseClient';
import { ICOData, ICODetails } from '../types';
import { ERC20_ABI, ICO_ABI } from '../contracts/abis';
import StyledConnectButton from '../components/StyledConnectButton';
import PurchaseConfirmModal from '../components/PurchaseConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SocialLinks from '../components/SocialLinks';
import { AuthContext } from '../context/AuthContext';
import { getJSTNow, formatJSTDateTime } from '../utils/date';

const ICODetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ico, setIco] = useState<ICOData | null>(null);
  const [icoDetails, setIcoDetails] = useState<ICODetails | null>(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [icoStatus, setIcoStatus] = useState<'upcoming' | 'active' | 'ended'>('upcoming');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [estimatedGas, setEstimatedGas] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userInvestment, setUserInvestment] = useState<bigint>(BigInt(0));
  const [remainingAllocation, setRemainingAllocation] = useState<string>('0');

  const { address } = useAccount();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const { data: allowance } = useContractRead({
    address: import.meta.env.VITE_USDT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`] : undefined,
    enabled: !!address,
    watch: true,
  });

  const { data: investmentData } = useContractRead({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'getUserInvestment',
    args: ico && address ? [BigInt(ico.contract_id), address] : undefined,
    enabled: !!ico && !!address,
    watch: true,
  });

  useEffect(() => {
    if (!investmentData || !ico) return;

    const currentInvestment = investmentData;
    setUserInvestment(currentInvestment);

    const maxPurchaseWei = parseEther(ico.max_purchase.toString());
    const remainingWei = maxPurchaseWei - currentInvestment;
    const remaining = remainingWei > 0 ? formatEther(remainingWei) : '0';
    setRemainingAllocation(remaining);
  }, [ico, investmentData]);

  useEffect(() => {
    const fetchICODetails = async () => {
      if (!id) return;
      try {
        const [icoResponse, detailsResponse] = await Promise.all([
          supabaseClient.from('icos').select('*').eq('id', id).single(),
          supabaseClient.from('ico_details').select('*').eq('ico_id', id).single()
        ]);

        if (icoResponse.error) throw icoResponse.error;
        if (detailsResponse.error) throw detailsResponse.error;

        setIco(icoResponse.data as ICOData);
        setIcoDetails(detailsResponse.data as ICODetails);

        // ICOのステータスを判定（JST基準）
        const now = getJSTNow();
        const startTime = new Date(icoResponse.data.start_date);
        const endTime = new Date(icoResponse.data.end_date);

        if (now < startTime) {
          setIcoStatus('upcoming');
        } else if (now > endTime) {
          setIcoStatus('ended');
        } else {
          setIcoStatus('active');
        }
      } catch (error) {
        console.error('Error fetching ICO details:', error);
        setErrorMessage('ICO情報の取得に失敗しました');
        setShowErrorModal(true);
      }
    };

    fetchICODetails();
  }, [id]);

  const { write: approveUSDT, data: approveData } = useContractWrite({
    address: import.meta.env.VITE_USDT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve'
  });

  const { write: purchaseTokens, data: purchaseData } = useContractWrite({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'purchaseTokens'
  });

  // Approve トランザクション待機
  const { isLoading: isApprovePending } = useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: async () => {
      setIsApproving(false);
      setIsPurchasing(true);
      try {
        if (!ico) return;
        const usdtAmountWei = parseEther(usdtAmount);
        await purchaseTokens({
          args: [BigInt(ico.contract_id), BigInt(usdtAmountWei)]
        });
      } catch (error: any) {
        handleTransactionError(error);
      }
    },
    onError: (error) => {
      handleTransactionError(error);
    }
  });

  // Purchase トランザクション待機
  const { isLoading: isPurchasePending } = useWaitForTransaction({
    hash: purchaseData?.hash,
    onSuccess: async () => {
      if (!ico || !user) return;
      try {
        await supabaseClient.from('purchases').insert([{
          user_id: user.id,
          ico_id: ico.id,
          amount: parseFloat(tokenAmount),
          price_per_token: ico.price,
          tx_hash: purchaseData?.hash
        }]);

        navigate('/purchase/complete');
      } catch (error) {
        console.error('Error saving purchase:', error);
        setErrorMessage('購入履歴の保存に失敗しました');
        setShowErrorModal(true);
      } finally {
        setIsPurchasing(false);
        setLoading(false);
      }
    },
    onError: (error) => {
      handleTransactionError(error);
    }
  });

  const handleTransactionError = (error: any) => {
    setLoading(false);
    setIsApproving(false);
    setIsPurchasing(false);
    setShowConfirmModal(false);

    if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
      setErrorMessage('トランザクションが拒否されました');
    } else {
      setErrorMessage('トランザクションの処理中にエラーが発生しました');
    }
    setShowErrorModal(true);
  };

  const handleAmountChange = (value: string, type: 'token' | 'usdt') => {
    if (!ico) return;

    let newTokenAmount: string;
    let newUsdtAmount: string;

    if (type === 'token') {
      newTokenAmount = value;
      newUsdtAmount = (parseFloat(value || '0') * ico.price).toString();
    } else {
      newUsdtAmount = value;
      newTokenAmount = (parseFloat(value || '0') / ico.price).toString();
    }

    setTokenAmount(newTokenAmount);
    setUsdtAmount(newUsdtAmount);
  };

  const handlePurchase = async () => {
    if (!ico || !tokenAmount || !address) return;

    if (!validatePurchaseAmount()) return;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_address')
      .eq('id', user?.id)
      .single();

    if (!profile?.wallet_address) {
      navigate('/account');
      return;
    }

    setEstimatedGas('0.002');
    setShowConfirmModal(true);
  };

  const validatePurchaseAmount = () => {
    if (!ico) return false;

    const purchaseAmount = parseFloat(usdtAmount);
    const remaining = parseFloat(remainingAllocation);

    if (purchaseAmount > remaining) {
      setErrorMessage(`購入可能額は${remaining.toLocaleString()} USDTまでです`);
      setShowErrorModal(true);
      return false;
    }

    if (purchaseAmount < ico.min_purchase) {
      setErrorMessage(`最小購入額は${ico.min_purchase} USDTです`);
      setShowErrorModal(true);
      return false;
    }

    return true;
  };

  const handleConfirmPurchase = async () => {
    if (!ico || !usdtAmount || !address) return;
    setLoading(true);
    try {
      const usdtAmountWei = parseEther(usdtAmount);

      // Allowanceチェック
      if (!allowance || allowance < BigInt(usdtAmountWei)) {
        setIsApproving(true);
        await approveUSDT({
          args: [
            import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`, 
            BigInt(usdtAmountWei)
          ]
        });
      } else {
        setIsPurchasing(true);
        await purchaseTokens({
          args: [BigInt(ico.contract_id), BigInt(usdtAmountWei)]
        });
      }
    } catch (error) {
      handleTransactionError(error);
    }
  };

  const RemainingAllocation = () => (
    <div className="bg-primary-50 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-primary-600">総購入済み額</span>
        <span className="font-medium text-primary-900">
          {formatEther(userInvestment)} USDT
        </span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-primary-600">残り購入可能額</span>
        <span className="font-medium text-primary-900">
          {Number(remainingAllocation).toLocaleString()} USDT
        </span>
      </div>
    </div>
  );

  if (!ico || !icoDetails) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto pb-16">
        {/* ヘッダー画像 */}
        <div className="relative h-64 md:h-96 mb-8 rounded-xl overflow-hidden">
          {ico.header_image_url && (
            <>
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.header_image_url}`}
                alt={`${ico.name} header`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          )}
          
          {/* プロジェクトアイコンとタイトル */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white shadow-lg">
                {ico.icon_image_url && (
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.icon_image_url}`}
                    alt={`${ico.name} icon`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold">{ico.name}</h1>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    {ico.symbol}
                  </span>
                  <span className={`px-4 py-2 text-sm font-medium ${
                    icoStatus === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    icoStatus === 'ended' ? 'bg-gray-100 text-gray-800' :
                    'bg-green-100 text-green-800'
                  } rounded-full`}>
                    {icoStatus === 'upcoming' ? '開始予定' :
                     icoStatus === 'ended' ? '終了' : '実施中'}
                  </span>
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
                <ReactMarkdown>{icoDetails.markdown_content}</ReactMarkdown>
              </div>

              <div className="mt-6">
                <SocialLinks
                  twitter={icoDetails.twitter_url}
                  discord={icoDetails.discord_url}
                  instagram={icoDetails.instagram_url}
                  website={icoDetails.website_url}
                  whitepaper={icoDetails.whitepaper_url}
                />
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
                  <p className="font-medium text-primary-900">
                    {ico.total_supply.toLocaleString()} {ico.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-primary-600">価格</p>
                  <p className="font-medium text-primary-900">{ico.price} USDT</p>
                </div>
                <div>
                  <p className="text-primary-600">開始日</p>
                  <p className="font-medium text-primary-900">
                    {formatJSTDateTime(ico.start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-primary-600">終了日</p>
                  <p className="font-medium text-primary-900">
                    {formatJSTDateTime(ico.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-primary-600">最小購入額</p>
                  <p className="font-medium text-primary-900">
                    {ico.min_purchase} USDT
                  </p>
                </div>
                <div>
                  <p className="text-primary-600">最大購入額</p>
                  <p className="font-medium text-primary-900">
                    {ico.max_purchase} USDT
                  </p>
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

              {address && <RemainingAllocation />}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    トークン数量
                  </label>
                  <input
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'token')}
                    className="input"
                    placeholder="0"
                    disabled={!address || loading || icoStatus !== 'active'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    支払いUSDT
                  </label>
                  <input
                    type="number"
                    value={usdtAmount}
                    onChange={(e) => handleAmountChange(e.target.value, 'usdt')}
                    className="input"
                    placeholder="0"
                    disabled={!address || loading || icoStatus !== 'active'}
                  />
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={
                    !address ||
                    !tokenAmount ||
                    loading ||
                    icoStatus !== 'active' ||
                    isApprovePending ||
                    isPurchasePending
                  }
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || isApprovePending || isPurchasePending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isApprovePending ? 'USDT承認待ち...' :
                       isPurchasePending ? '購入処理待ち...' :
                       '処理中...'}
                    </span>
                  ) : (
                    icoStatus === 'upcoming' ? '開始前のため購入できません' :
                    icoStatus === 'ended' ? '終了済みのため購入できません' :
                    !address ? 'ウォレットを接続してください' :
                    !tokenAmount ? '数量を入力してください' :
                    '購入する'
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

        <PurchaseConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmPurchase}
          tokenAmount={tokenAmount}
          usdtAmount={`${usdtAmount} USDT`}
          tokenSymbol={ico.symbol}
          estimatedGas={estimatedGas}
          isLoading={loading}
          isApproving={isApproving}
          isPurchasing={isPurchasing}
          currentInvestment={formatEther(userInvestment)}
          remainingAllocation={remainingAllocation}
        />

        <ErrorModal
          isOpen={showErrorModal}
          message={errorMessage}
          onClose={() => setShowErrorModal(false)}
        />
      </div>
    </div>
  );
};

export default ICODetail;