import React from 'react'
import { useNavigate } from 'react-router-dom'

const PurchaseComplete: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4">購入が完了しました！</h2>
        <p className="text-gray-600 mb-8">
          トークンの購入が正常に完了しました。購入履歴はアカウント設定ページから確認できます。
        </p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            ダッシュボードに戻る
          </button>
          <button
            onClick={() => navigate('/account')}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
          >
            購入履歴を確認
          </button>
        </div>
      </div>
    </div>
  )
}

export default PurchaseComplete
