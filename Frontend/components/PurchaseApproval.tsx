"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const PurchaseApproval: React.FC = () => {
  const navigate = useNavigate()

  const [reservedOrders, setReservedOrders] = useState([])

  useEffect(() => {
    fetchReservedOrders()
  }, [])

  const fetchReservedOrders = async () => {
    try {
      const response = await fetch("http://localhost:8000/orders/reserved", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setReservedOrders(data)
    } catch (error) {
      console.error("Error fetching reserved orders:", error)
    }
  }

  const handleApproveOrder = async (orderId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/approve-purchase/${orderId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        alert("Order approved successfully!")
        setReservedOrders(reservedOrders.filter(order => order.id !== orderId)) // Remove approved order from list
      } else {
        alert("Failed to approve order.")
      }
    } catch (error) {
      console.error("Error approving order:", error)
    }
  }

  const handleRejectOrder = async (orderId: number) => {
    const reason = prompt("Enter rejection reason:")
    if (!reason) return

    try {
      const response = await fetch(`http://localhost:8000/reject-purchase/${orderId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        alert("Order rejected successfully!")
        setReservedOrders(reservedOrders.filter(order => order.id !== orderId))
      } else {
        alert("Failed to reject order.")
      }
    } catch (error) {
      console.error("Error rejecting order:", error)
    }
  }

  return (
    <div className="container mx-auto p-6 bg-gray-100 mt-6">
      <h1 className="text-3xl font-bold text-center text-gray-800">Purchase Approvals</h1>
      <button onClick={() => navigate(-1)} className="bg-gray-500 text-white px-4 py-2 rounded-lg mb-4">← Back</button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {reservedOrders.length === 0 ? (
          <p className="text-gray-600 text-center col-span-full">No pending approvals.</p>
        ) : (
          reservedOrders.map(order => (
            <div key={order.id} className="bg-white shadow-md rounded-lg p-4">
              <h2 className="text-xl font-semibold">Order ID: {order.id}</h2>
              <p className="text-gray-700">Customer: {order.customer_name}</p>
              <p className="text-gray-700">Total Price: ${order.total_price}</p>
              <p className="text-gray-700">Status: {order.status}</p>

              <ul className="mt-2">
                {order.items.map(item => (
                  <li key={item.id} className="text-gray-600">
                    {item.product_name} - {item.quantity} pcs
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleApproveOrder(order.id)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg mt-4 w-full"
              >
                Approve Purchase
              </button>
              <button
                onClick={() => handleRejectOrder(order.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg mt-2 w-full"
              >
                Reject Purchase
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PurchaseApproval
