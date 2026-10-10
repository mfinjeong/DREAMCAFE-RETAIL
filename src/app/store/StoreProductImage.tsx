import React from "react";
import { GlassWater, Utensils, Cookie, Package } from "lucide-react";

interface StoreProductImageProps {
  productName: string;
  categoryName: string;
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
 * Placeholder image component for Store products
 * Uses clean, consistent visual fallback because verified product images are not available
 */
export const StoreProductImage: React.FC<StoreProductImageProps> = ({
  productName,
  categoryName,
  className = "",
}) => {
  const icon = CATEGORY_ICON_MAP[categoryName] || <Package className="w-10 h-10" />;

  return (
    <div
      className={`flex items-center justify-center bg-surface-muted border border-surface-border rounded-[6px] aspect-[4/3] ${className}`}
    >
      <div className="text-text-muted flex flex-col items-center justify-center gap-2 p-4">
        {icon}
        <span className="text-[11px] font-mono text-text-secondary text-center max-w-[80%] truncate">
          {categoryName}
        </span>
      </div>
    </div>
  );
};
