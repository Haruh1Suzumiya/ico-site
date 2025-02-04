import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContractWrite } from 'wagmi';
import { parseEther } from 'viem';
import supabaseClient from '../lib/supabaseClient';
import { ICO_ABI } from '../contracts/abis';
import MarkdownEditor from '../components/MarkdownEditor';
import SocialLinks from '../components/SocialLinks';

interface ICOFormData {
  name: string;
  symbol: string;
  description: string;
  markdownContent: string;
  price: string;
  totalSupply: string;
  startDate: string;
  endDate: string;
  minPurchase: string;
  maxPurchase: string;
  headerImage: File | null;
  iconImage: File | null;
  twitter: string;
  discord: string;
  instagram: string;
  website: string;
  whitepaper: string;
}

interface SalePhase {
  startDate: string;
  endDate: string;
  price: string;
  maxAllocation: string;
  percentage: string;
}

const ICOCreatePage: React.FC = () => {
  const [formData, setFormData] = useState<ICOFormData>({
    name: '',
    symbol: '',
    description: '',
    markdownContent: '',
    price: '',
    totalSupply: '',
    startDate: '',
    endDate: '',
    minPurchase: '',
    maxPurchase: '',
    headerImage: null,
    iconImage: null,
    twitter: '',
    discord: '',
    instagram: '',
    website: '',
    whitepaper: ''
  });

  const [salePhases, setSalePhases] = useState<SalePhase[]>([{
    startDate: '',
    endDate: '',
    price: '',
    maxAllocation: '',
    percentage: ''
  }]);

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);
  const [iconImagePreview, setIconImagePreview] = useState<string | null>(null);

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

  const handleMarkdownChange = (value: string) => {
    setFormData(prev => ({ ...prev, markdownContent: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'icon') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onloadend = () => {
      if (type === 'header') {
        setHeaderImagePreview(reader.result as string);
        setFormData(prev => ({ ...prev, headerImage: file }));
      } else {
        setIconImagePreview(reader.result as string);
        setFormData(prev => ({ ...prev, iconImage: file }));
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleSocialLinksUpdate = (type: string, value: string) => {
    setFormData(prev => ({ ...prev, [type]: value }));
  };

  const handlePhaseChange = (index: number, field: keyof SalePhase, value: string) => {
    const newPhases = [...salePhases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setSalePhases(newPhases);
  };

  const addPhase = () => {
    setSalePhases([...salePhases, {
      startDate: '',
      endDate: '',
      price: '',
      maxAllocation: '',
      percentage: ''
    }]);
  };

  const removePhase = (index: number) => {
    setSalePhases(salePhases.filter((_, i) => i !== index));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.name && formData.symbol && formData.description);
      case 2:
        return !!(formData.markdownContent && formData.headerImage && formData.iconImage);
      case 3:
        return !!(
          formData.price && 
          formData.totalSupply && 
          formData.startDate && 
          formData.endDate &&
          formData.minPurchase &&
          formData.maxPurchase
        );
      case 4:
        const totalPercentage = salePhases.reduce((sum, phase) => 
          sum + (phase.percentage ? parseFloat(phase.percentage) : 0), 0
        );
        return salePhases.every(phase => 
          phase.startDate && 
          phase.endDate && 
          phase.price && 
          phase.maxAllocation &&
          phase.percentage
        ) && Math.abs(totalPercentage - 100) < 0.01; // 許容誤差0.01%
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setLoading(true);
    setError('');

    try {
      let headerImageUrl = '';
      let iconImageUrl = '';

      if (formData.headerImage) {
        const { data: headerData, error: headerError } = await supabaseClient
          .storage
          .from('ico-images')
          .upload(`header-${Date.now()}-${formData.headerImage.name}`, formData.headerImage);
        
        if (headerError) throw headerError;
        headerImageUrl = headerData.path;
      }

      if (formData.iconImage) {
        const { data: iconData, error: iconError } = await supabaseClient
          .storage
          .from('ico-images')
          .upload(`icon-${Date.now()}-${formData.iconImage.name}`, formData.iconImage);
        
        if (iconError) throw iconError;
        iconImageUrl = iconData.path;
      }

      const startTime = BigInt(Math.floor(new Date(formData.startDate).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(formData.endDate).getTime() / 1000));
      const totalSupply = parseEther(formData.totalSupply);
      const tokenPrice = parseEther(formData.price);
      const minPurchase = parseEther(formData.minPurchase);
      const maxPurchase = parseEther(formData.maxPurchase);

      // Phase dates and percentages
      const phaseStartTimes = salePhases.map(phase => 
        BigInt(Math.floor(new Date(phase.startDate).getTime() / 1000))
      );
      const phaseEndTimes = salePhases.map(phase => 
        BigInt(Math.floor(new Date(phase.endDate).getTime() / 1000))
      );
      const phasePrices = salePhases.map(phase => parseEther(phase.price));
      const phaseAllocations = salePhases.map(phase => parseEther(phase.maxAllocation));

      // Create ICO on blockchain
      await createICO({
        args: [
          formData.name,
          formData.symbol,
          totalSupply,
          tokenPrice,
          startTime,
          endTime,
          minPurchase,
          maxPurchase,
          phaseStartTimes,
          phaseEndTimes,
          phasePrices,
          phaseAllocations
        ]
      });

      // Save to database
      const { data: icoData, error: icoError } = await supabaseClient
        .from('icos')
        .insert([{
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          price: parseFloat(formData.price),
          start_date: formData.startDate,
          end_date: formData.endDate,
          total_supply: parseFloat(formData.totalSupply),
          min_purchase: parseFloat(formData.minPurchase),
          max_purchase: parseFloat(formData.maxPurchase),
          header_image_url: headerImageUrl,
          icon_image_url: iconImageUrl,
          is_active: true
        }])
        .select()
        .single();

      if (icoError) throw icoError;

      // Save ICO details
      const { error: detailsError } = await supabaseClient
        .from('ico_details')
        .insert([{
          ico_id: icoData.id,
          markdown_content: formData.markdownContent,
          twitter_url: formData.twitter,
          discord_url: formData.discord,
          instagram_url: formData.instagram,
          website_url: formData.website,
          whitepaper_url: formData.whitepaper
        }]);

      if (detailsError) throw detailsError;

      // Save sale phases
      const { error: phasesError } = await supabaseClient
        .from('sale_phases')
        .insert(
          salePhases.map((phase, index) => ({
            ico_id: icoData.id,
            phase_number: index + 1,
            start_date: phase.startDate,
            end_date: phase.endDate,
            price: parseFloat(phase.price),
            max_allocation: parseFloat(phase.maxAllocation),
            percentage: parseFloat(phase.percentage)
          }))
        );

      if (phasesError) throw phasesError;

      // Reset form
      setFormData({
        name: '',
        symbol: '',
        description: '',
        markdownContent: '',
        price: '',
        totalSupply: '',
        startDate: '',
        endDate: '',
        minPurchase: '',
        maxPurchase: '',
        headerImage: null,
        iconImage: null,
        twitter: '',
        discord: '',
        instagram: '',
        website: '',
        whitepaper: ''
      });
      setSalePhases([{
        startDate: '',
        endDate: '',
        price: '',
        maxAllocation: '',
        percentage: ''
      }]);
      setHeaderImagePreview(null);
      setIconImagePreview(null);
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
        {[1, 2, 3, 4].map((currentStep) => (
          <React.Fragment key={currentStep}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${step >= currentStep 
                  ? 'bg-primary-900 text-white' 
                  : 'bg-primary-100 text-primary-600'}`}
            >
              {currentStep}
            </div>
            {currentStep < 4 && (
              <div className={`w-16 h-1 ${step > currentStep ? 'bg-primary-900' : 'bg-primary-100'}`} />
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
          {step === 1 && (
            <div className="space-y-6">
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
                  簡単な説明
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input min-h-[120px]"
                  placeholder="プロジェクトの簡単な説明を入力"
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  ヘッダー画像
                </label>
                <div className="space-y-4">
                  <input
                    type="file"
                    onChange={(e) => handleImageChange(e, 'header')}
                    accept="image/*"
                    className="w-full"
                  />
                  {headerImagePreview && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <img
                        src={headerImagePreview}
                        alt="Header Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  アイコン画像
                </label>
                <div className="space-y-4">
                  <input
                    type="file"
                    onChange={(e) => handleImageChange(e, 'icon')}
                    accept="image/*"
                    className="w-full"
                  />
                  {iconImagePreview && (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden">
                      <img
                        src={iconImagePreview}
                        alt="Icon Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  詳細説明
                </label>
                <MarkdownEditor
                  value={formData.markdownContent}
                  onChange={handleMarkdownChange}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-4">
                  SNSリンク
                </label>
                <SocialLinks
                  twitter={formData.twitter}
                  discord={formData.discord}
                  instagram={formData.instagram}
                  website={formData.website}
                  whitepaper={formData.whitepaper}
                  isEditing={true}
                  onUpdate={handleSocialLinksUpdate}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
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

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    最小購入額 (USDT)
                  </label>
                  <input
                    type="number"
                    name="minPurchase"
                    value={formData.minPurchase}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="100"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    最大購入額 (USDT)
                  </label>
                  <input
                    type="number"
                    name="maxPurchase"
                    value={formData.maxPurchase}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="10000"
                    step="0.01"
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
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary-900">販売フェーズ設定</h3>
                <button
                  type="button"
                  onClick={addPhase}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>フェーズを追加</span>
                </button>
              </div>

              <AnimatePresence>
                {salePhases.map((phase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 bg-primary-50 rounded-lg space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-primary-900">フェーズ {index + 1}</h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removePhase(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          開始日時
                        </label>
                        <input
                          type="datetime-local"
                          value={phase.startDate}
                          onChange={(e) => handlePhaseChange(index, 'startDate', e.target.value)}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          終了日時
                        </label>
                        <input
                          type="datetime-local"
                          value={phase.endDate}
                          onChange={(e) => handlePhaseChange(index, 'endDate', e.target.value)}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          価格 (USDT)
                        </label>
                        <input
                          type="number"
                          value={phase.price}
                          onChange={(e) => handlePhaseChange(index, 'price', e.target.value)}
                          className="input"
                          placeholder="0.0"
                          step="0.000001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          最大配分 (USDT)
                        </label>
                        <input
                          type="number"
                          value={phase.maxAllocation}
                          onChange={(e) => handlePhaseChange(index, 'maxAllocation', e.target.value)}
                          className="input"
                          placeholder="10000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          配分割合 (%)
                        </label>
                        <input
                          type="number"
                          value={phase.percentage}
                          onChange={(e) => handlePhaseChange(index, 'percentage', e.target.value)}
                          className="input"
                          placeholder="20"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* アクションボタン */}
      <div className="flex justify-between mt-8">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="btn-secondary"
          >
            戻る
          </button>
        )}
        
        <button
          type="button"
          onClick={() => step === 4 ? handleSubmit() : setStep(step + 1)}
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
          ) : step === 4 ? (
            'ICOを作成'
          ) : (
            '次へ'
          )}
        </button>
      </div>
    </div>
  );
};

export default ICOCreatePage;