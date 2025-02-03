import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, className = '' }) => {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium text-primary-700">
          {isPreview ? 'プレビュー' : 'Markdown エディタ'}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsPreview(!isPreview)}
          className="btn-secondary text-sm"
        >
          {isPreview ? '編集に戻る' : 'プレビュー'}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {isPreview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="prose prose-primary max-w-none bg-white rounded-lg p-6 min-h-[20rem] shadow-inner"
          >
            <ReactMarkdown>{value}</ReactMarkdown>
          </motion.div>
        ) : (
          <motion.textarea
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[20rem] p-4 rounded-lg shadow-inner bg-white font-mono text-sm"
            placeholder="Markdownで記述してください..."
          />
        )}
      </AnimatePresence>

      {!isPreview && (
        <div className="text-sm text-primary-600">
          # 見出し1
          ## 見出し2
          **太字** *イタリック*
          - リスト
          1. 番号付きリスト
          [リンク](URL)
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;