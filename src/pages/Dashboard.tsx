import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabaseClient from '../lib/supabaseClient'
import { ICOData } from '../types'
import StyledConnectButton from '../components/StyledConnectButton'

const Dashboard: React.FC = () => {
  const [icos, setIcos] = useState<ICOData[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchICOs = async () => {
      const { data, error } = await supabaseClient
        .from('icos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) console.error('Error fetching ICOs:', error)
      else setIcos(data || [])
    }
    fetchICOs()
  }, [])

  const handleICOClick = (icoId: string) => {
    navigate(`/ico/${icoId}`)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ICO一覧</h1>
        <StyledConnectButton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {icos.map((ico) => (
          <div
            key={ico.id}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleICOClick(ico.id)}
          >
            {ico.image_url && (
              <div className="mb-4">
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ico-images/${ico.image_url}`}
                  alt={ico.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            <h3 className="text-xl font-semibold">{ico.name}</h3>
            <p className="text-gray-600 line-clamp-2">{ico.description}</p>
            <div className="mt-4">
              <p className="font-medium">価格: {ico.price} USDT</p>
              <p className="text-sm text-gray-500">
                期間: {new Date(ico.start_date).toLocaleDateString()} - {new Date(ico.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
