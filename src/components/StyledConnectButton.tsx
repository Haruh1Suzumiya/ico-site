import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface Props {
  className?: string
}

const StyledConnectButton: React.FC<Props> = ({ className }) => (
  <div className={className}>
    <ConnectButton />
  </div>
)

export default StyledConnectButton
