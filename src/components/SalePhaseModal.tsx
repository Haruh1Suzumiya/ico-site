import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContractWrite, useWaitForTransaction } from 'wagmi';
import { ICO_ABI } from '../contracts/abis';
import { parseEther } from 'viem';

interface SalePhase {
  startDate: string;
  endDate: string;
  price: string;
  maxAllocation: string;
}

interface SalePhaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  icoId: number;
  icoStartDate: string;
  icoEndDate: string;
  onSuccess?: () => void;
}

const SalePhaseModal: React.FC<SalePhaseModalProps> = ({
  isOpen,
  onClose,
  icoId,
  icoStartDate,
  icoEndDate,
  onSuccess
}) => {
  const [phases, setPhases] = useState<SalePhase[]>([{
    startDate: icoStartDate,
    endDate: icoEndDate,
    price: '',
    maxAllocation: ''
  }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const { write: setSalePhases, data: salePhaseData } = useContractWrite({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'setSalePhases'
  });

  const { isLoading: isWaitingForTx } = useWaitForTransaction({
    hash: salePhaseData?.hash,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const addPhase = () => {
    const lastPhase = phases[phases.length - 1];
    setPhases([...phases, {
      startDate: lastPhase.endDate,
      endDate: lastPhase.endDate,
      price: lastPhase.price || '',
      maxAllocation: lastPhase.maxAllocation || ''
    }]);
  };

  const removePhase = (index: number) => {
    if (phases.length > 1) {
      setPhases(phases.filter((_, i) => i !== index));
    }
  };

  const handlePhaseChange = (index: number, field: keyof SalePhase, value: string) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setPhases(newPhases);
  };

  const validatePhases = () => {
    const timeRanges: { start: number; end: number }[] = [];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      
      if (!phase.startDate || !phase.endDate || !phase.price || !phase.maxAllocation) {
        throw new Error(`フェーズ ${i + 1}: すべての項目を入力してください`);
      }

      const startTime = new Date(phase.startDate).getTime();
      const endTime = new Date(phase.endDate).getTime();
      
      if (isNaN(startTime) || isNaN(endTime)) {
        throw new Error(`フェーズ ${i + 1}: 無効な日付が含まれています`);
      }

      if (startTime >= endTime) {
        throw new Error(`フェーズ ${i + 1}: 終了日時は開始日時より後に設定してください`);
      }

      const icoStart = new Date(icoStartDate).getTime();
      const icoEnd = new Date(icoEndDate).getTime();
      if (startTime < icoStart || endTime > icoEnd) {
        throw new Error(`フェーズ ${i + 1}: ICOの期間内で設定してください`);
      }

      const price = parseFloat(phase.price);
      if (isNaN(price) || price <= 0) {
        throw new Error(`フェーズ ${i + 1}: 価格は0より大きい値を設定してください`);
      }

      const maxAllocation = parseFloat(phase.maxAllocation);
      if (isNaN(maxAllocation) || maxAllocation <= 0) {
        throw new Error(`フェーズ ${i + 1}: 最大配分は0より大きい値を設定してください`);
      }

      for (const range of timeRanges) {
        if (!(endTime <= range.start || startTime >= range.end)) {
          throw new Error(`フェーズ ${i + 1}: 他のフェーズと期間が重複しています`);
        }
      }
      timeRanges.push({ start: startTime, end: endTime });
    }

    for (let i = 1; i < phases.length; i++) {
      const prevEnd = new Date(phases[i - 1].endDate).getTime();
      const currentStart = new Date(phases[i].startDate).getTime();
      if (prevEnd !== currentStart) {
        throw new Error(`フェーズ ${i + 1}: 前のフェーズの終了時刻と開始時刻を一致させてください`);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      validatePhases();

      setIsProcessing(true);
      setError(null);

      const startTimes = phases.map(phase => 
        BigInt(Math.floor(new Date(phase.startDate).getTime() / 1000))
      );
      const endTimes = phases.map(phase => 
        BigInt(Math.floor(new Date(phase.endDate).getTime() / 1000))
      );
      const prices = phases.map(phase => parseEther(phase.price));
      const maxAllocations = phases.map(phase => parseEther(phase.maxAllocation));

      await setSalePhases({
        args: [BigInt(icoId), startTimes, endTimes, prices, maxAllocations]
      });

    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-[10%] -translate-x-1/2 w-full max-w-lg bg-white rounded-lg shadow-xl z-50"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-primary-900">セールフェーズ設定</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded"
                >
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              <div className="mb-6">
                <div className="bg-white rounded-lg space-y-6">
                  {phases.map((phase, index) => (
                    <div key={index} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-primary-900">フェーズ {index + 1}</h3>
                        {index > 0 && (
                          <button
                            onClick={() => removePhase(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">開始日時</label>
                            <input
                              type="datetime-local"
                              value={phase.startDate}
                              onChange={(e) => handlePhaseChange(index, 'startDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">終了日時</label>
                            <input
                              type="datetime-local"
                              value={phase.endDate}
                              onChange={(e) => handlePhaseChange(index, 'endDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">価格 (USDT)</label>
                            <input
                              type="number"
                              value={phase.price}
                              onChange={(e) => handlePhaseChange(index, 'price', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                              placeholder="0.0"
                              step="0.000001"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">最大配分 (USDT)</label>
                            <input
                              type="number"
                              value={phase.maxAllocation}
                              onChange={(e) => handlePhaseChange(index, 'maxAllocation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                              placeholder="10000"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={addPhase}
                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md text-sm flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>フェーズを追加</span>
              </button>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || isWaitingForTx}
                  className="flex-1 px-4 py-2 bg-black hover:bg-gray-900 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {isProcessing || isWaitingForTx ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{isWaitingForTx ? 'トランザクション処理中...' : '保存中...'}</span>
                    </span>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>

              <p className="mt-3 text-xs text-center text-gray-500">
                ※変更を保存するにはウォレットでの承認が必要です
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SalePhaseModal;