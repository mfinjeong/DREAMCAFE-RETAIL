import React, { useEffect, useState } from "react";
import { GlassWater, Utensils, Cookie, Package } from "lucide-react";

interface StoreProductImageProps {
  productName: string;
  categoryName: string;
  imageUrl?: string | null;
  className?: string;
}

/**
 * Fallback icon mapping for store product categories
 */
const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  "Minuman Dingin": <GlassWater className="w-10 h-10" />,
  "Makanan Berat": <Utensils className="w-10 h-10" />,
  "Snack & Cemilan": <Cookie className="w-10 h-10" />,
  "Gaming Gear & Aksesoris": <Package className="w-10 h-10" />,
};

/**
 * Product image component with support for verified product photos and fallback icons.
 * - If imageUrl is provided and valid, display it using Next.js Image for optimization.
 * - If no image or image fails to load, show category-based icon as placeholder.
 * - Ensures consistent dimensions and prevents layout shifts.
 */
export const StoreProductImage: React.FC<StoreProductImageProps> = ({
  productName,
  categoryName,
  imageUrl,
  className = "",
}) => {
  const [failedLoading, setFailedLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setFailedLoading(false);
    setImageLoaded(false);
  }, [imageUrl]);

  // Use fallback icon only if no imageUrl OR if imageUrl loading failed
  const shouldShowFallback = !imageUrl || failedLoading;
  const icon = shouldShowFallback ? (CATEGORY_ICON_MAP[categoryName] || <Package className="w-10 h-10" />) : null;

  // Determine rasio berdasarkan kategori untuk konsistensi tampilan produk
  const getAspectRatio = (name: string): string => {
    switch (name) {
      case "Gaming Gear & Aksesoris":
        return "aspect-[5/4]"; // Rasio lebar untuk aksesoris
      default:
        return "aspect-[4/3]"; // Standar untuk produk makanan/minuman
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-surface-muted border border-surface-border rounded-[6px] ${getAspectRatio(categoryName)} ${className}`}
    >
      {imageUrl && !shouldShowFallback ? (
        <>
          <img
            src={imageUrl}
            alt={productName}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setFailedLoading(true);
              setImageLoaded(false);
            }}
            loading="lazy"
            className={`w-full h-full object-contain p-2 transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          />
          {!imageLoaded && (
            <div
              className="absolute inset-0 animate-pulse bg-surface-muted"
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 text-text-muted">
          {icon}
          <span className="text-[11px] font-mono text-text-secondary text-center max-w-[80%] truncate block mt-2">
            {categoryName}
          </span>
        </div>
      )}
    </div>
  );
};
