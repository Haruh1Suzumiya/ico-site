import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseClient from '../lib/supabaseClient';
import { useContractWrite } from 'wagmi';
import { parseEther } from 'viem';
import { ICO_ABI } from '../contracts/abis';

interface ICOFormData {
  name: string;
  symbol: string;
  description: string;
  price: string;
  totalSupply: string;
  startDate: string;
  endDate: string;
  image: File | null;
}

const ICOCreatePage: React.FC = () => {
  const [formData, setFormData] = useState<ICOFormData>({
    name: '',
    symbol: '',
    description: '',
    price: '',
    totalSupply: '',
    startDate: '',
    endDate: '',
    image: null,
  });
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { write: createICO } = useContractWrite({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'createICO'
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFormData(prev => ({ ...prev, image: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.name && formData.symbol && formData.description);
      case 2:
        return !!(formData.price && formData.totalSupply && formData.startDate && formData.endDate);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setLoading(true);
    setError('');

    try {
      let imageUrl = '';
      if (formData.image) {
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('ico-images')
          .upload(`${Date.now()}-${formData.image.name}`, formData.image);
        
        if (uploadError) throw uploadError;
        imageUrl = uploadData.path;
      }

      const startTime = BigInt(Math.floor(new Date(formData.startDate).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(formData.endDate).getTime() / 1000));
      const totalSupply = parseEther(formData.totalSupply);
      const tokenPrice = parseEther(formData.price);

      await createICO({
        args: [
          formData.name,
          formData.symbol,
          totalSupply,
          tokenPrice,
          startTime,
          endTime
        ]
      });

      const { error: dbError } = await supabaseClient
        .from('icos')
        .insert([
          {
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            price: parseFloat(formData.price),
            start_date: formData.startDate,
            end_date: formData.endDate,
            total_supply: parseFloat(formData.totalSupply),
            image_url: imageUrl,
            isActive: true
          }
        ]);

      if (dbError) throw dbError;

      setFormData({
        name: '',
        symbol: '',
        description: '',
        price: '',
        totalSupply: '',
        startDate: '',
        endDate: '',
        image: null
      });
      setImagePreview(null);
      setStep(1);
      
      alert('ICOが正常に作成されました！');

    } catch (err: any) {
      console.error('ICO creation error:', err);
      setError(err.message || 'ICOの作成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* ステップインジケーター */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2].map((currentStep) => (
          <React.Fragment key={currentStep}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${step >= currentStep 
                  ? 'bg-primary-900 text-white' 
                  : 'bg-primary-100 text-primary-600'}`}
            >
              {currentStep}
            </div>
            {currentStep < 2 && (
              <div className={`w-20 h-1 ${step > currentStep ? 'bg-primary-900' : 'bg-primary-100'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* フォームコンテンツ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  プロジェクト名
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="プロジェクト名を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  シンボル
                </label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="例: BTC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  説明文
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input min-h-[120px]"
                  placeholder="プロジェクトの詳細な説明を入力"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  画像
                </label>
                <div className="space-y-4">
                  <input
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="w-full"
                  />
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    価格 (USDT)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    総供給量
                  </label>
                  <input
                    type="number"
                    name="totalSupply"
                    value={formData.totalSupply}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="1000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    開始日時
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    終了日時
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="input"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* アクションボタン */}
      <div className="flex justify-between mt-8">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-secondary"
          >
            戻る
          </button>
        )}
        
        <button
          type="button"
          onClick={() => step === 1 ? setStep(2) : handleSubmit()}
          disabled={!validateStep(step) || loading}
          className={`btn-primary ml-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>処理中...</span>
            </span>
          ) : step === 1 ? (
            '次へ'
          ) : (
            'ICOを作成'
          )}
        </button>
      </div>
    </div>
  );
};

export default ICOCreatePage;