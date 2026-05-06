import Image from 'next/image'
import logoIcon from '@/assets/logo-icon.svg'
import logoText from '@/assets/logo-text.svg'

interface BrandLogoProps {
  priority?: boolean
  logoUrl?: string | null
  storeName?: string
  showText?: boolean
  size?: 'default' | 'large'
  width?: number
  height?: number
}

export default function BrandLogo({
  priority = false,
  logoUrl,
  storeName = 'Crown & Crest',
  showText = false,
  size = 'large',
  width,
  height
}: BrandLogoProps) {
  const imageSize = size === 'large' ? 120 : 56

  // If custom logo URL is provided, use it
  if (logoUrl) {
    const customStyle = width || height ? { width, height } : undefined
    return (
      <div className="flex items-center gap-4">
        <div
          className={`relative ${size === 'large' ? 'w-[120px] h-[120px]' : 'w-14 h-14'}`}
          style={customStyle}
        >
          <Image
            src={logoUrl}
            alt={storeName}
            fill
            className="object-contain"
            priority={priority}
          />
        </div>
      </div>
    )
  }

  // Otherwise, use default logo
  return (
    <div className="flex items-center gap-3">
      {/* Logo Icon - Always visible on all screens */}
      <Image
        src={logoIcon}
        alt={storeName}
        width={imageSize}
        height={imageSize}
        priority={priority}
      />

      {/* Logo Text - Only visible on desktop (hidden on mobile) */}
      {showText && (
        <Image
          src={logoText}
          alt=""
          width={size === 'large' ? 200 : 180}
          height={size === 'large' ? 50 : 45}
          priority={priority}
          className="hidden md:block"
        />
      )}
    </div>
  )
}
