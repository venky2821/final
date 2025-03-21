import type React from "react"
import { BarChart } from "lucide-react"

interface InventoryItemType {
  id: number
  name: string
  quantity: number
}

interface AnalyticsProps {
  inventory: InventoryItemType[]
}

const Analytics: React.FC<AnalyticsProps> = ({ inventory }) => {
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const averageStock = totalItems / inventory.length
  const mostPopular = inventory.length > 0 ? inventory.reduce((prev, current) => (prev.quantity < current.quantity ? current : prev)) : null

  return (
    <div className="bg-white shadow-md rounded-lg p-4 col-span-2">
      <div className="flex items-center mb-4">
        <BarChart className="w-6 h-6 text-indigo-500 mr-2" />
        <h2 className="text-xl font-semibold">Analytics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Total Items in Stock</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalItems}</p>
        </div>
        <div className="bg-indigo-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Average Stock per Item</h3>
          <p className="text-3xl font-bold text-indigo-600">{averageStock.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Most Popular Item</h3>
          <p className="text-xl font-bold text-indigo-600">{mostPopular?.name}</p>
          <p className="text-indigo-600">Quantity: {mostPopular?.quantity}</p>
        </div>
      </div>
    </div>
  )
}

export default Analytics
