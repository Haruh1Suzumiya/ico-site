import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabaseClient from '../lib/supabaseClient';
import { ICOData } from '../types';
import StyledConnectButton from '../components/StyledConnectButton';

const Dashboard: React.FC = () => {
  const [icos, setIcos] = useState<ICOData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchICOs = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('icos')
          .select('*')
          .order('start_date', { ascending: true });
        
        if (error) throw error;
        setIcos(data || []);
      } catch (error) {
        console.error('Error fetching ICOs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchICOs();
  }, []);

  const getCurrentTimestamp = () => new Date().getTime();

  const filterICOs = (status: 'active' | 'upcoming' | 'ended') => {
    const now = getCurrentTimestamp();
    return icos.filter(ico => {
      const startTime = new Date(ico.start_date).getTime();
      const endTime = new Date(ico.end_date).getTime();
      
      switch (status) {
        case 'active':
          return startTime <= now && endTime >= now;
        case 'upcoming':
          return startTime > now;
        case 'ended':
          return endTime < now;
        default:
          return false;
      }
    });
  };

  const handleICOClick = (icoId: string) => {
    navigate(`/ico/${icoId}`);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const getStatusBadge = (ico: ICOData) => {
    const now = getCurrentTimestamp();
    const startTime = new Date(ico.start_date).getTime();
    const endTime = new Date(ico.end_date).getTime();

    if (now < startTime) {
      return (
        <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
          開始予定
        </span>
      );
    } else if (now > endTime) {
      return (
        <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
          終了
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
        実施中
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-primary-200 rounded-lg"></div>
          <div className="h-64 w-80 bg-primary-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const renderICOCards = (filteredICOs: ICOData[]) => {
    if (filteredICOs.length === 0) {
      return (
        <motion.div
          variants={item}
          className="col-span-full text-center py-12"
        >
          <p className="text-primary-600">該当するICOプロジェクトはありません</p>
        </motion.div>
      );
    }

    return filteredICOs.map((ico) => (
      <motion.div
        key={ico.id}
        variants={item}
        whileHover={{ y: -5 }}
        onClick={() => handleICOClick(ico.id)}
        className="card group cursor-pointer"
      >
        {ico.image_url && (
          <div className="relative h-48 overflow-hidden rounded-t-xl">
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.image_url}`}
              alt={ico.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-primary-900 group-hover:text-primary-700 transition-colors">
                {ico.name}
              </h3>
              <span className="text-sm font-medium text-primary-600">
                {ico.symbol}
              </span>
            </div>
            {getStatusBadge(ico)}
          </div>
          <p className="text-primary-600 line-clamp-2 mb-4 h-12">
            {ico.description}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-primary-600">価格</span>
              <span className="font-medium text-primary-900">{ico.price} USDT</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-primary-600">期間</span>
              <span className="font-medium text-primary-900">
                {new Date(ico.start_date).toLocaleDateString()} - {new Date(ico.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    ));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">ICO一覧</h1>
          <p className="text-primary-600 mt-2">利用可能なICOプロジェクト</p>
        </div>
        <StyledConnectButton className="w-full sm:w-auto" />
      </div>

      <div className="mb-8">
        <div className="border-b border-primary-200">
          <nav className="flex space-x-8" aria-label="ICO Status">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-primary-900 text-primary-900'
                  : 'border-transparent text-primary-600 hover:text-primary-700 hover:border-primary-300'
              }`}
            >
              実施中
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upcoming'
                  ? 'border-primary-900 text-primary-900'
                  : 'border-transparent text-primary-600 hover:text-primary-700 hover:border-primary-300'
              }`}
            >
              開始予定
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ended'
                  ? 'border-primary-900 text-primary-900'
                  : 'border-transparent text-primary-600 hover:text-primary-700 hover:border-primary-300'
              }`}
            >
              終了済み
            </button>
          </nav>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {renderICOCards(filterICOs(activeTab))}
      </motion.div>
    </div>
  );
};

export default Dashboard;