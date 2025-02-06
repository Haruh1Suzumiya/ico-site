import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi';
import { parseEther } from 'viem';
import supabaseClient from '../lib/supabaseClient';
import { ICO_ABI } from '../contracts/abis';
import MarkdownEditor from '../components/MarkdownEditor';
import SocialLinks from '../components/SocialLinks';
import { toJSTString } from '../utils/date';

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

interface VestingSchedule {
  releaseDate: string;
  percentage: string;
}

interface DateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  label: string;
  inheritDate?: string;
}

interface ImageUploaderProps {
  previewUrl: string | null;
  onChange: (file: File) => void;
  onRemove: () => void;
  label: string;
  className?: string;
  aspectRatio?: 'square' | 'banner';
}

const DateSelector: React.FC<DateSelectorProps> = ({ 
  value, 
  onChange, 
  minDate, 
  label,
  inheritDate 
}) => {
  const [localValue, setLocalValue] = useState<string>(() => {
    return inheritDate ? toJSTString(new Date(inheritDate)) : value || toJSTString(new Date());
  });

  useEffect(() => {
    if (inheritDate) {
      const inheritedDate = new Date(inheritDate);
      inheritedDate.setHours(inheritedDate.getHours() + 1); // 終了時刻から1時間後
      const newValue = toJSTString(inheritedDate);
      if (newValue !== localValue) {
        setLocalValue(newValue);
        onChange(newValue);
      }
    }
  }, [inheritDate, localValue, onChange]);

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const minDateString = minDate 
    ? toJSTString(minDate)
    : toJSTString(new Date());

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-primary-700">
        {label}
      </label>
      <div className="relative">
        <input
          type="datetime-local"
          value={localValue}
          min={minDateString}
          onChange={handleDateTimeChange}
          className="input w-full"
        />
        <div className="text-xs text-primary-500 mt-1">
          ※日本時間（JST）で入力してください
        </div>
      </div>
    </div>
  );
};

const ImageUploader: React.FC<ImageUploaderProps> = ({
  previewUrl,
  onChange,
  onRemove,
  label,
  className = '',
  aspectRatio = 'square'
}) => {
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      onChange(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onChange(files[0]);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-primary-700 mb-2">
        {label}
      </label>
      {previewUrl ? (
        <div className="relative">
          <div className={`relative rounded-lg overflow-hidden ${
            aspectRatio === 'banner' ? 'aspect-[16/5]' : 'aspect-square'
          }`}>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
              <button
                onClick={onRemove}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDrag}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed border-primary-300 rounded-lg p-4 transition-colors hover:border-primary-500 cursor-pointer ${
            aspectRatio === 'banner' ? 'aspect-[16/5]' : 'aspect-square'
          }`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-center">
              <p className="text-primary-600 text-sm">
                ドラッグ＆ドロップ
                <br />
                または
                <br />
                クリックしてアップロード
              </p>
            </div>
          </div>
        </div>
      )}
      <p className="mt-1 text-sm text-primary-500">
        推奨サイズ: {aspectRatio === 'banner' ? '1600x500px' : '500x500px'}
      </p>
    </div>
  );
};

const ICOCreatePage: React.FC = () => {
  const [formData, setFormData] = useState<ICOFormData>({
    name: '',
    symbol: '',
    description: '',
    markdownContent: '# プロジェクトの詳細説明\n\n## 概要\n\n## 特徴\n\n## ロードマップ\n\n## チーム\n\n## トークンの用途',
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

  const [vestingSchedules, setVestingSchedules] = useState<VestingSchedule[]>([{
    releaseDate: '',
    percentage: '100'
  }]);

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [txError, setTxError] = useState<string | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);
  const [iconImagePreview, setIconImagePreview] = useState<string | null>(null);
  const [headerImageUrl, setHeaderImageUrl] = useState<string>('');
  const [iconImageUrl, setIconImageUrl] = useState<string>('');

  // ICOのカウントを取得
  const { data: icoCount } = useContractRead({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'icoCount'
  });

  const { write: createICO, data: createICOData } = useContractWrite({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'createICO'
  });

  // createICOData.hashが存在する場合のみトランザクション待機フックを有効化する
  const { isLoading: isWaitingForTx } = useWaitForTransaction({
    hash: createICOData?.hash,
    enabled: Boolean(createICOData?.hash),
    onSuccess: async () => {
      try {
        // Save to database with contract_id
        const { data: icoData, error: icoError } = await supabaseClient
          .from('icos')
          .insert([{
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            price: parseFloat(formData.price),
            start_date: new Date(formData.startDate).toISOString(),
            end_date: new Date(formData.endDate).toISOString(),
            total_supply: parseFloat(formData.totalSupply),
            min_purchase: parseFloat(formData.minPurchase),
            max_purchase: parseFloat(formData.maxPurchase),
            header_image_url: headerImageUrl,
            icon_image_url: iconImageUrl,
            is_active: true,
            is_visible: true,
            contract_id: Number(icoCount)
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
            twitter_url: formData.twitter ? `https://twitter.com/${formData.twitter}` : null,
            discord_url: formData.discord ? `https://discord.gg/${formData.discord}` : null,
            instagram_url: formData.instagram ? `https://instagram.com/${formData.instagram}` : null,
            website_url: formData.website,
            whitepaper_url: formData.whitepaper
          }]);

        if (detailsError) throw detailsError;

        // Save vesting schedules
        const { error: vestingError } = await supabaseClient
          .from('vesting_schedules')
          .insert(
            vestingSchedules.map(schedule => ({
              ico_id: icoData.id,
              release_date: new Date(schedule.releaseDate).toISOString(),
              release_percent: parseFloat(schedule.percentage)
            }))
          );

        if (vestingError) throw vestingError;

        alert('ICOが正常に作成されました！');

        // Reset form
        setFormData({
          name: '',
          symbol: '',
          description: '',
          markdownContent: '# プロジェクトの詳細説明\n\n## 概要\n\n## 特徴\n\n## ロードマップ\n\n## チーム\n\n## トークンの用途',
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
        setVestingSchedules([{
          releaseDate: '',
          percentage: '100'
        }]);
        setHeaderImagePreview(null);
        setIconImagePreview(null);
        setHeaderImageUrl('');
        setIconImageUrl('');
        setStep(1);

      } catch (err) {
        console.error('Database error:', err);
        setError('データベースの更新中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
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

  const handleHeaderImageChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setHeaderImagePreview(reader.result as string);
      setFormData(prev => ({ ...prev, headerImage: file }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleIconImageChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconImagePreview(reader.result as string);
      setFormData(prev => ({
        ...prev,
        iconImage: file
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleHeaderImageRemove = () => {
    setHeaderImagePreview(null);
    setFormData(prev => ({ ...prev, headerImage: null }));
  };

  const handleIconImageRemove = () => {
    setIconImagePreview(null);
    setFormData(prev => ({ ...prev, iconImage: null }));
  };

  const handleSocialLinksUpdate = (type: string, value: string) => {
    // @マークがついている場合は削除
    const cleanValue = value.startsWith('@') ? value.substring(1) : value;
    setFormData(prev => ({ ...prev, [type]: cleanValue }));
  };

  const handleVestingScheduleChange = (index: number, field: keyof VestingSchedule, value: string) => {
    const newSchedules = [...vestingSchedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    
    // パーセンテージが変更された場合、合計が100%を超えないようにチェック
    if (field === 'percentage') {
      const total = newSchedules.reduce((sum, s, i) => {
        return i === index ? sum + parseFloat(value || '0') : sum + parseFloat(s.percentage || '0');
      }, 0);
      
      if (total > 100) {
        alert('合計が100%を超えています。適切な値に調整してください。');
        return;
      }
    }
    
    setVestingSchedules(newSchedules);
  };

  const addVestingSchedule = () => {
    const currentTotal = vestingSchedules.reduce((sum, schedule) => 
      sum + parseFloat(schedule.percentage || '0'), 0
    );
    
    if (currentTotal >= 100) {
      alert('すでに100%に達しています。既存のスケジュールを調整してください。');
      return;
    }

    // 最後のスケジュールの日時を取得し、1日後に設定
    const lastSchedule = vestingSchedules[vestingSchedules.length - 1];
    let nextDate;
    
    if (lastSchedule.releaseDate) {
      const lastDate = new Date(lastSchedule.releaseDate);
      nextDate = new Date(lastDate.setDate(lastDate.getDate() + 1));
    } else {
      // 初回の場合はICO終了時刻から1時間後
      nextDate = new Date(formData.endDate);
      nextDate.setHours(nextDate.getHours() + 1);
    }

    setVestingSchedules([...vestingSchedules, {
      releaseDate: nextDate.toISOString(),
      percentage: (100 - currentTotal).toString()
    }]);
  };

  const removeVestingSchedule = (index: number) => {
    setVestingSchedules(vestingSchedules.filter((_, i) => i !== index));
  };

  const validateStep = (currentStep: number): boolean => {
    try {
      switch (currentStep) {
        case 1:
          if (!formData.name || !formData.symbol || !formData.description) {
            return false;
          }
          return true;

        case 2:
          if (!formData.markdownContent || !formData.headerImage || !formData.iconImage) {
            return false;
          }
          return true;

        case 3:
          if (!formData.price || !formData.totalSupply || !formData.startDate || 
              !formData.endDate || !formData.minPurchase || !formData.maxPurchase) {
            return false;
          }

          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          const now = new Date();

          if (start <= now || end <= start) {
            return false;
          }

          // Validate numbers
          const price = parseFloat(formData.price);
          const minPurchase = parseFloat(formData.minPurchase);
          const maxPurchase = parseFloat(formData.maxPurchase);

          if (isNaN(price) || price <= 0 || 
              isNaN(minPurchase) || minPurchase <= 0 ||
              isNaN(maxPurchase) || maxPurchase <= minPurchase) {
            return false;
          }

          return true;

        case 4:
          const totalPercentage = vestingSchedules.reduce((sum, schedule) => 
            sum + (schedule.percentage ? parseFloat(schedule.percentage) : 0), 0
          );

          if (Math.abs(totalPercentage - 100) >= 0.001) {
            return false;
          }

          const endDate = new Date(formData.endDate);
          const hasValidSchedules = vestingSchedules.every(schedule => 
            schedule.releaseDate && 
            schedule.percentage &&
            new Date(schedule.releaseDate) > endDate &&
            parseFloat(schedule.percentage) > 0
          );

          return hasValidSchedules;

        default:
          return true;
      }
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setLoading(true);
    setError('');
    setTxError(null);

    try {
      // Upload images first
      if (formData.headerImage) {
        const { data: headerData, error: headerError } = await supabaseClient
          .storage
          .from('ico-images')
          .upload(`header-${Date.now()}-${formData.headerImage.name}`, formData.headerImage);
        
        if (headerError) throw headerError;
        setHeaderImageUrl(headerData.path);
      }

      if (formData.iconImage) {
        const { data: iconData, error: iconError } = await supabaseClient
          .storage
          .from('ico-images')
          .upload(`icon-${Date.now()}-${formData.iconImage.name}`, formData.iconImage);
        
        if (iconError) throw iconError;
        setIconImageUrl(iconData.path);
      }

      // Validate required fields
      if (!formData.name || !formData.symbol || !formData.totalSupply || 
          !formData.price || !formData.startDate || !formData.endDate || 
          !formData.minPurchase || !formData.maxPurchase) {
        throw new Error('必須項目が入力されていません');
      }

      // Convert JST dates to UNIX timestamp for smart contract
      const startTime = BigInt(Math.floor(new Date(formData.startDate).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(formData.endDate).getTime() / 1000));

      // Check dates
      if (startTime >= endTime) {
        throw new Error('終了日時は開始日時より後に設定してください');
      }
      
      // Parse amounts with proper decimal handling
      const totalSupply = parseEther(formData.totalSupply);
      const tokenPrice = parseEther(formData.price);
      const minPurchase = parseEther(formData.minPurchase);
      const maxPurchase = parseEther(formData.maxPurchase);

      // Validate vesting schedule
      const totalPercentage = vestingSchedules.reduce((sum, schedule) => 
        sum + parseFloat(schedule.percentage || '0'), 0
      );
      
      if (Math.abs(totalPercentage - 100) > 0.001) {
        throw new Error('ベスティングスケジュールの合計は100%である必要があります');
      }

      // Prepare vesting schedules
      const vestingDates = vestingSchedules.map(schedule => {
        const date = new Date(schedule.releaseDate);
        if (date <= new Date(formData.endDate)) {
          throw new Error('ベスティング日時はICO終了後に設定してください');
        }
        return BigInt(Math.floor(date.getTime() / 1000));
      });

      const vestingPercents = vestingSchedules.map(schedule => 
        BigInt(Math.floor(parseFloat(schedule.percentage)))
      );

      if (!createICO) {
        throw new Error('createICO function is not available');
      }

      // Call contract creation
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
          vestingDates,
          vestingPercents
        ]
      });

    } catch (err: any) {
      console.error('ICO creation error:', err);
      if (err.message.includes('User rejected') || 
          err.message.includes('user rejected') ||
          err.message.includes('User denied')) {
        setTxError('トランザクションが拒否されました');
        setLoading(false);
      } else {
        setError(err.message || 'ICOの作成中にエラーが発生しました');
      }
      setLoading(false);
    }
  };

  // トランザクションエラー表示
  const renderTransactionError = () => {
    if (!txError) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4"
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{txError}</p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={() => setTxError(null)}
              className="inline-flex text-red-400 hover:text-red-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    );
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

      {/* エラー表示 */}
      {renderTransactionError()}

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
              <ImageUploader
                previewUrl={headerImagePreview}
                onChange={handleHeaderImageChange}
                onRemove={handleHeaderImageRemove}
                label="ヘッダー画像"
                aspectRatio="banner"
              />

              <ImageUploader
                previewUrl={iconImagePreview}
                onChange={handleIconImageChange}
                onRemove={handleIconImageRemove}
                label="アイコン画像"
                aspectRatio="square"
              />

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
                <div className="mt-2 text-sm text-primary-500">
                  ※Twitter/Instagram/Discordはユーザー名のみを入力してください（例: @なしで入力）
                </div>
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
                <DateSelector
                  label="開始日時"
                  value={formData.startDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
                  minDate={new Date()}
                />
                <DateSelector
                  label="終了日時"
                  value={formData.endDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
                  minDate={formData.startDate ? new Date(formData.startDate) : new Date()}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-primary-900">ベスティングスケジュール</h3>
                <button
                  type="button"
                  onClick={addVestingSchedule}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>スケジュールを追加</span>
                </button>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-yellow-800">
                  <span className="font-medium">ベスティングスケジュールの合計: </span>
                  {vestingSchedules.reduce((sum, schedule) => sum + parseFloat(schedule.percentage || '0'), 0)}%
                  {vestingSchedules.reduce((sum, schedule) => sum + parseFloat(schedule.percentage || '0'), 0) !== 100 && (
                    <span className="block mt-1 text-red-600">
                      ※合計が100%になるように設定してください
                    </span>
                  )}
                </p>
              </div>

              <AnimatePresence initial={false}>
                {vestingSchedules.map((schedule, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 bg-primary-50 rounded-lg space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-primary-900">スケジュール {index + 1}</h4>
                      {index > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => removeVestingSchedule(index)}
                          className="text-red-600 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </motion.button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DateSelector
                        label="解放日時"
                        value={schedule.releaseDate}
                        onChange={(value) => handleVestingScheduleChange(index, 'releaseDate', value)}
                        minDate={formData.endDate ? new Date(formData.endDate) : new Date()}
                        inheritDate={index === 0 ? formData.endDate : vestingSchedules[index - 1]?.releaseDate}
                      />

                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          解放割合 (%)
                        </label>
                        <input
                          type="number"
                          value={schedule.percentage}
                          onChange={(e) => handleVestingScheduleChange(index, 'percentage', e.target.value)}
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
    
                  {(error || txError) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
                    >
                      <p className="text-red-700">{error || txError}</p>
                    </motion.div>
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
              disabled={!validateStep(step) || loading || isWaitingForTx}
              className={`btn-primary ml-auto ${(loading || isWaitingForTx) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading || isWaitingForTx ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{isWaitingForTx ? 'トランザクション処理中...' : '処理中...'}</span>
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