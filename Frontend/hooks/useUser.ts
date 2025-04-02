import { useState, useEffect } from "react"

interface User {
  id: number
  email: string
  username: string
  role_id: number
  is_active: boolean
}

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/auth/me", {
          method: "GET",
          credentials: "include", // Ensures cookies are sent with the request (if using sessions)
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}` // Sends stored token
          }
        })

        if (!response.ok) {
          throw new Error("Failed to fetch user")
        }

        const userData = await response.json()
        setUser(userData) // ✅ Store real user data
      } catch (error) {
        console.error("Error fetching user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const logout = () => {
    localStorage.removeItem("token") // ✅ Remove token from storage
    setUser(null)
  }

  return { user, loading, logout }
}
