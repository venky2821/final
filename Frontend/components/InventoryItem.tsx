import type React from "react"
import Image from "next/image"

interface InventoryItemProps {
  item: {
    id: number
    name: string
    stock_level: number
    reorder_threshold: number
    batchInfo: string
    supplier_id: number
    image_url: string
  }
}

const InventoryItem: React.FC<InventoryItemProps> = ({ item }) => {
  const isLowStock = item.stock_level <= item.reorder_threshold

  return (
    <div className={`w-full h-24 border rounded-md p-3 flex items-center space-x-4 ${isLowStock ? "bg-red-100" : "bg-gray-50"}`}>
      <div className="w-16 h-16 flex-shrink-0">
        <Image 
          src={item.image_url || "/placeholder.svg"} 
          alt={item.name} 
          width={64} 
          height={64} 
          className="rounded-md object-cover w-full h-full" 
          unoptimized 
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate">{item.name}</h3>
        <div className="mt-1 space-y-1">
          <p className="text-xs text-gray-600">Quantity: {item.stock_level}</p>
          <p className="text-xs text-gray-500">Supplier: {item.supplier_id}</p>
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className={`px-2 py-1 rounded-full text-xs ${
          isLowStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
        }`}>
          {isLowStock ? "Low Stock" : "In Stock"}
        </span>
      </div>
    </div>
  )
}

export default InventoryItem
