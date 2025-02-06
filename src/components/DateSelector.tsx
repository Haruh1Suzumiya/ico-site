import React from 'react';
import { toJSTString } from '../utils/date';

interface DateSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  className?: string;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  label,
  value,
  onChange,
  minDate,
  className = ''
}) => {
  // 初期値または無効な日付の場合は現在時刻を使用
  const defaultValue = value || toJSTString(new Date());
  
  // 最小日時の設定
  const minDateString = minDate 
    ? toJSTString(minDate)
    : toJSTString(new Date());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-primary-700">
        {label}
      </label>
      <div className="relative">
        <input
          type="datetime-local"
          value={defaultValue}
          min={minDateString}
          onChange={handleChange}
          className="input w-full pr-10"
        />
        <div className="absolute inset-y-0 right-0 px-3 flex items-center pointer-events-none">
          <svg 
            className="w-5 h-5 text-primary-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
        <div className="text-xs text-primary-500 mt-1">
          ※日本時間（JST）で入力してください
        </div>
      </div>
    </div>
  );
};

export default DateSelector;