import type React from "react"
import InventoryItem from "./InventoryItem"
import { List } from "lucide-react"

interface InventoryItemType {
  id: number
  name: string
  stock_level: number
  reorder_threshold: number
  batchInfo: string
  supplier: string
  image_url: string
}

interface InventoryListProps {
  inventory: InventoryItemType[]
}

const InventoryList: React.FC<InventoryListProps> = ({ inventory }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="flex items-center mb-4">
        <List className="w-6 h-6 text-blue-500 mr-2" />
        <h2 className="text-xl font-semibold">Inventory List</h2>
      </div>
      <div className="space-y-2">
        {inventory.map((item) => (
          <InventoryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export default InventoryList

