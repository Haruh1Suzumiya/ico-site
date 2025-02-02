import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ※ 使用していない StyledConnectButton のインポートは削除
// import StyledConnectButton from '../components/StyledConnectButton';
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [previewDescription, setPreviewDescription] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string>('');

  // Contract write hook for createICO
  const { write: createICO } = useContractWrite({
    address: import.meta.env.VITE_ICO_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'createICO'
  });

  const variants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, image: files[0] }));
    }
  };

  const handleNext = () => {
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    setTxLoading(true);
    setTxError('');
    try {
      let imageUrl = '';
      if (formData.image) {
        // "ico-images" バケットが Supabase Storage に存在することを確認してください
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('ico-images')
          .upload(`${Date.now()}-${formData.image.name}`, formData.image);
        if (uploadError) throw uploadError;
        imageUrl = uploadData.path;
      }
      const totalSupply = parseEther(formData.totalSupply);
      const tokenPrice = parseEther(formData.price);
      const startTime = BigInt(Math.floor(new Date(formData.startDate).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(formData.endDate).getTime() / 1000));
      
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
            image_url: imageUrl
          }
        ]);
      if (dbError) throw dbError;
      
      alert("ICOが作成されました！");
      setFormData({
        name: '',
        symbol: '',
        description: '',
        price: '',
        totalSupply: '',
        startDate: '',
        endDate: '',
        image: null,
      });
      setCurrentStep(1);
    } catch (err: any) {
      console.error("ICO作成エラー:", err);
      setTxError(err.message || "エラーが発生しました");
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">ICO作成</h2>
      {/* AnimatePresence の exitBeforeEnter を削除し、mode="wait" を指定 */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">プロジェクト名</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">シンボル</label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">説明文</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border rounded-md p-2"
                  rows={4}
                />
                <button
                  type="button"
                  onClick={() => setPreviewDescription(prev => !prev)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  {previewDescription ? "編集モードに戻る" : "プレビュー"}
                </button>
                {previewDescription && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 p-2 border rounded-md bg-gray-50"
                  >
                    {formData.description || "説明文が入力されていません。"}
                  </motion.div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">価格 (USDT)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">総供給量</label>
                  <input
                    type="number"
                    name="totalSupply"
                    value={formData.totalSupply}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border rounded-md p-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">開始日</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">終了日</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border rounded-md p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">画像</label>
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="mt-1 block w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                次へ
              </button>
            </div>
          </motion.div>
        )}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-semibold mb-4">最終確認</h3>
            <div className="space-y-2">
              <p><span className="font-bold">プロジェクト名:</span> {formData.name}</p>
              <p><span className="font-bold">シンボル:</span> {formData.symbol}</p>
              <p><span className="font-bold">説明:</span> {formData.description}</p>
              <p><span className="font-bold">価格 (USDT):</span> {formData.price}</p>
              <p><span className="font-bold">総供給量:</span> {formData.totalSupply}</p>
              <p><span className="font-bold">開始日:</span> {formData.startDate}</p>
              <p><span className="font-bold">終了日:</span> {formData.endDate}</p>
              {formData.image && (
                <div>
                  <span className="font-bold">画像:</span>
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="mt-2 max-h-48 object-contain"
                  />
                </div>
              )}
            </div>
            {txError && <p className="mt-4 text-red-600">{txError}</p>}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={txLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {txLoading ? "送信中..." : "ICOを作成"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ICOCreatePage;