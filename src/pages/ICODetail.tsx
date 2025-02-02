import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount, useContractWrite } from 'wagmi'
import { parseEther } from 'viem'
import supabaseClient from '../lib/supabaseClient'
import { ICOData } from '../types'
import { ERC20_ABI, ICO_ABI } from '../contracts/abis'
import StyledConnectButton from '../components/StyledConnectButton'
import { AuthContext } from '../context/AuthContext'

const ICODetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [ico, setIco] = useState<ICOData | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const { address } = useAccount()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  useEffect(() => {
    const fetchICODetails = async () => {
      if (!id) return
      const { data, error } = await supabaseClient
        .from('icos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching ICO details:', error)
        return
      }

      setIco(data as ICOData)
    }

    fetchICODetails()
  }, [id])

  const { write: approveUSDT } = useContractWrite({
    address: import.meta.env.VITE_USDT_CONTRACT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve'
  })

  const { write: purchaseTokens } = useContractWrite({
    address: import.meta.env.VITE_ICO_CONTRACT_ADDRESS as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'purchaseTokens'
  })

  const handlePurchase = async () => {
    if (!ico || !amount || !address) return

    setLoading(true)
    try {
      // ウォレット接続確認
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('wallet_address')
        .eq('id', user?.id)
        .single()

      if (!profile?.wallet_address) {
        navigate('/account')
        return
      }

      // USDT承認
      const usdtAmount = parseEther(amount)
      await approveUSDT({
        args: [import.meta.env.VITE_ICO_CONTRACT_ADDRESS, BigInt(usdtAmount)]
      })

      // トークン購入
      await purchaseTokens({
        args: [BigInt(ico.contract_id), BigInt(usdtAmount)]
      })

      // 購入履歴の保存
      await supabaseClient.from('purchases').insert([
        {
          user_id: user?.id,
          ico_id: ico.id,
          amount: BigInt(Math.floor(parseFloat(amount))),
          price_per_token: BigInt(ico.price)
        }
      ])

      // 完了画面へ遷移
      navigate('/purchase/complete')
    } catch (error) {
      console.error('Purchase error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {ico && (
        <div>
          <h1 className="text-3xl font-bold mb-6">{ico.name}</h1>
          {ico.image_url && (
            <div className="mb-8">
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.image_url}`}
                alt={ico.name}
                className="w-full rounded-lg"
              />
            </div>
          )}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">プロジェクト詳細</h2>
              <p className="text-gray-700">{ico.description}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">トークン情報</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">シンボル</p>
                  <p className="font-medium">{ico.symbol}</p>
                </div>
                <div>
                  <p className="text-gray-600">価格</p>
                  <p className="font-medium">{ico.price} USDT</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">購入</h2>
              <StyledConnectButton className="mb-4" />
              <div className="space-y-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border rounded-md p-2"
                  placeholder="購入数量"
                  disabled={!address || loading}
                />
                <button
                  onClick={handlePurchase}
                  disabled={!address || !amount || loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-md disabled:bg-gray-400"
                >
                  {loading ? '処理中...' : '購入する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ICODetail
