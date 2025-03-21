import type React from "react"
import Image from "next/image"

interface InventoryItemProps {
  item: {
    id: number
    name: string
    stock_level: number
    reorder_threshold: number
    batchInfo: string
    supplier: string
    image_url: string
  }
}

const InventoryItem: React.FC<InventoryItemProps> = ({ item }) => {
  const isLowStock = item.stock_level <= item.reorder_threshold

  return (
    <div className={`border rounded-md p-2 ${isLowStock ? "bg-red-100" : "bg-gray-50"}`}>
      <div className="flex items-center space-x-2">
        <Image src={item.image_url || "/placeholder.svg"} alt={item.name} width={50} height={50} className="rounded-md" />
        <div>
          <h3 className="font-semibold text-sm">{item.name}</h3>
          <p className="text-xs">Quantity: {item.stock_level}</p>
        </div>
      </div>
    </div>
  )
}

export default InventoryItem
