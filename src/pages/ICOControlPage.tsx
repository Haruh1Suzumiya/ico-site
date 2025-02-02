import React, { useState, useEffect } from 'react';
import supabaseClient from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface ICOData {
  id: string;
  name: string;
  symbol: string;
  tokenPrice: number;
  startTime: string;
  endTime: string;
  totalSupply: number;
  soldAmount: number;
  isActive: boolean;
  created_at: string;
}

const ICOControlPage: React.FC = () => {
  const [icos, setIcos] = useState<ICOData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchICOs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabaseClient
        .from('icos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setIcos(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchICOs();
  }, []);

  const toggleICOStatus = async (icoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('icos')
        .update({ isActive: !currentStatus })
        .eq('id', icoId);
      if (error) {
        alert("ステータス更新エラー: " + error.message);
      } else {
        fetchICOs();
      }
    } catch (err: any) {
      alert("エラー: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">ICO制御</h2>
      {loading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <AnimatePresence>
        {icos.map((ico) => (
          <motion.div
            key={ico.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="border p-4 rounded-md mb-4 flex flex-col md:flex-row justify-between items-center"
          >
            <div>
              <h3 className="font-bold">{ico.name} ({ico.symbol})</h3>
              <p>価格: {ico.tokenPrice} USDT</p>
              <p>期間: {ico.startTime} 〜 {ico.endTime}</p>
              <p>総供給量: {ico.totalSupply} (販売済: {ico.soldAmount})</p>
            </div>
            <button
              onClick={() => toggleICOStatus(ico.id, ico.isActive)}
              className={`mt-4 md:mt-0 px-4 py-2 rounded-md transition-colors ${ico.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {ico.isActive ? '非アクティブにする' : 'アクティブにする'}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ICOControlPage;
