import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseClient from '../lib/supabaseClient';
import { ICOData } from '../types';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

const ICOControlPage: React.FC = () => {
  const [icos, setIcos] = useState<ICOData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  
  // ページネーション用のstate
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIcos, setTotalIcos] = useState(0);

  useEffect(() => {
    fetchICOs();
  }, [currentPage, selectedFilter]);

  const fetchICOs = async () => {
    setLoading(true);
    setError('');
    try {
      // まず現在のフィルタに基づいて総数を取得
      let query = supabaseClient.from('icos').select('*', { count: 'exact' });

      // フィルタリング条件の適用
      if (selectedFilter !== 'all') {
        const now = new Date().toISOString();
        switch (selectedFilter) {
          case 'active':
            query = query
              .lt('start_date', now)
              .gt('end_date', now);
            break;
          case 'upcoming':
            query = query
              .gt('start_date', now);
            break;
          case 'ended':
            query = query
              .lt('end_date', now);
            break;
        }
      }

      const { count: totalCount } = await query;
      const total = totalCount || 0;
      setTotalIcos(total);
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));

      // 実際のデータ取得
      query = supabaseClient
        .from('icos')
        .select('*')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      // 同じフィルタリング条件を適用
      if (selectedFilter !== 'all') {
        const now = new Date().toISOString();
        switch (selectedFilter) {
          case 'active':
            query = query
              .lt('start_date', now)
              .gt('end_date', now);
            break;
          case 'upcoming':
            query = query
              .gt('start_date', now);
            break;
          case 'ended':
            query = query
              .lt('end_date', now);
            break;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setIcos(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleICOStatus = async (icoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('icos')
        .update({ isActive: !currentStatus })
        .eq('id', icoId);
      
      if (error) throw error;
      await fetchICOs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getICOStatus = (ico: ICOData): 'active' | 'upcoming' | 'ended' => {
    const now = new Date().getTime();
    const startTime = new Date(ico.start_date).getTime();
    const endTime = new Date(ico.end_date).getTime();

    if (now < startTime) return 'upcoming';
    if (now > endTime) return 'ended';
    return 'active';
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    setCurrentPage(1); // フィルター変更時は1ページ目に戻る
  };

  const getStatusColor = (status: 'active' | 'upcoming' | 'ended') => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'upcoming', 'ended'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === filter
                  ? 'bg-primary-900 text-white'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              {filter === 'all' ? 'すべて' : 
               filter === 'active' ? '実施中' :
               filter === 'upcoming' ? '開始予定' : '終了済み'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-primary-600">
          全{totalIcos}件 ({currentPage}/{totalPages}ページ)
        </p>
      </div>

      <AnimatePresence mode="popLayout">
        {icos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <p className="text-primary-600">該当するICOプロジェクトはありません</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {icos.map((ico) => {
              const status = getICOStatus(ico);
              return (
                <motion.div
                  key={ico.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="card p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-primary-900">
                          {ico.name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                          {status === 'active' ? '実施中' :
                           status === 'upcoming' ? '開始予定' : '終了済み'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-primary-600">
                        <div>
                          <span>総供給量: </span>
                          <span className="font-medium text-primary-900">
                            {ico.total_supply.toLocaleString()} {ico.symbol}
                          </span>
                        </div>
                        <div>
                          <span>価格: </span>
                          <span className="font-medium text-primary-900">
                            {ico.price} USDT
                          </span>
                        </div>
                        <div>
                          <span>開始日: </span>
                          <span className="font-medium text-primary-900">
                            {new Date(ico.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span>終了日: </span>
                          <span className="font-medium text-primary-900">
                            {new Date(ico.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleICOStatus(ico.id, ico.isActive)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        ico.isActive
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {ico.isActive ? '非アクティブにする' : 'アクティブにする'}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ICOControlPage;