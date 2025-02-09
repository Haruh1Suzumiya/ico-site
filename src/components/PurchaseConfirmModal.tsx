import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurchaseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenAmount: string;
  usdtAmount: string;
  tokenSymbol: string;
  estimatedGas?: string;
  isLoading?: boolean;
  isApproving?: boolean;
  isPurchasing?: boolean;
  currentInvestment: string;
  remainingAllocation: string;
}

const PurchaseConfirmModal: React.FC<PurchaseConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tokenAmount,
  usdtAmount,
  tokenSymbol,
  estimatedGas,
  isLoading = false,
  isApproving = false,
  isPurchasing = false,
  currentInvestment,
  remainingAllocation,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl"
            >
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-primary-900">購入内容の確認</h3>
                  <p className="text-primary-600 mt-2">以下の内容で購入を実行します</p>
                </div>

                <div className="space-y-4">
                  {/* 購入内容 */}
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-primary-600">購入トークン数</p>
                        <p className="font-medium text-primary-900">
                          {tokenAmount} {tokenSymbol}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-primary-600">支払いUSDT</p>
                        <p className="font-medium text-primary-900">{usdtAmount}</p>
                      </div>
                    </div>
                  </div>

                  {/* 投資状況 */}
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm text-primary-600">現在の総購入額</p>
                        <p className="font-medium text-primary-900">{currentInvestment} USDT</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-primary-600">残り購入可能額</p>
                        <p className="font-medium text-primary-900">{remainingAllocation} USDT</p>
                      </div>
                    </div>
                  </div>

                  {/* ガス代の表示 */}
                  {estimatedGas && (
                    <div className="bg-primary-50 rounded-lg p-4">
                      <p className="text-sm text-primary-600">推定ガス代</p>
                      <p className="font-medium text-primary-900">{estimatedGas} ETH</p>
                    </div>
                  )}

                  {/* 注意事項 */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">注意：</span>
                      トランザクションを送信すると、この操作は取り消せません。
                      大口購入の場合、安全のため実際の購入額が若干調整される可能性があります。
                      ガス代は実際の使用量によって変動する可能性があります。
                    </p>
                  </div>
                </div>

                {/* ボタン */}
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    キャンセル
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>
                          {isApproving ? 'USDT承認待ち...' :
                           isPurchasing ? '購入処理待ち...' :
                           '処理中...'}
                        </span>
                      </div>
                    ) : (
                      '購入を確定'
                    )}
                  </motion.button>
                </div>

                <p className="mt-2 text-xs text-center text-primary-500">
                  ※USDT承認と購入の2つのトランザクションが必要になります
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PurchaseConfirmModal;