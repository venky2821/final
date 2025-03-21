"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const CustomerReviewApproval: React.FC = () => {
    const navigate = useNavigate()

    const [reviews, setReviews] = useState([])
    const [filterStatus, setFilterStatus] = useState("all");


    useEffect(() => {
        fetchReviews()
    }, [])

    const fetchReviews = async () => {
        try {
            const response = await fetch("http://localhost:8000/reviews/all", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            const data = await response.json()
            setReviews(data)
        } catch (error) {
            console.error("Error fetching reviews:", error)
        }
    }

    const handleApproveReview = async (reviewId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/reviews/${reviewId}/approve`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
            })

            if (response.ok) {
                alert("Review approved successfully!")
                // setReviews(reviews.filter(review => review.id !== reviewId)) // Remove approved review from list
                fetchReviews();
            } else {
                alert("Failed to approve review.")
            }
        } catch (error) {
            console.error("Error approving review:", error)
        }
    }

    const handleRejectReview = async (reviewId: number) => {
        const reason = prompt("Enter rejection reason:")
        if (!reason) return

        try {
            const response = await fetch(`http://localhost:8000/reviews/${reviewId}/reject`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason }),
            })

            if (response.ok) {
                alert("Review rejected successfully!")
                // setReviews(reviews.filter(review => review.id !== reviewId))
                fetchReviews();
            } else {
                alert("Failed to reject review.")
            }
        } catch (error) {
            console.error("Error rejecting review:", error)
        }
    }

    const filteredReviews = reviews.filter(review =>
        filterStatus === "all" ? true : review.approved.toString() === filterStatus
    );

    return (
        <div className="container mx-auto p-6 bg-gray-100 mt-6">
            <h1 className="text-3xl font-bold text-center text-gray-800">Customer Reviews</h1>
            <button onClick={() => navigate(-1)} className="bg-gray-500 text-white px-4 py-2 rounded-lg mb-4">← Back</button>
            {/* Filter Dropdown */}
            <div className="flex justify-center mb-4">
                <label className="mr-2 text-gray-700">Filter by approval status:</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1"
                >
                    <option value="all">All</option>
                    <option value="0">Not Approved</option>
                    <option value="1">Approved</option>
                    <option value="-1">Rejected</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {filteredReviews.length === 0 ? (
                    <p className="text-gray-600 text-center col-span-full">No reviews found.</p>
                ) : (
                    filteredReviews.map(review => (
                        <div key={review.id} className="bg-white shadow-md rounded-lg p-4">
                            <h2 className="text-xl font-semibold">Review ID: {review.id}</h2>
                            <p className="text-gray-700">Customer: {review.user_name}</p>
                            <p className="text-gray-700">Rating: {review.rating}</p>
                            <p className="text-gray-700">Review Text: {review.review_text}</p>
                            <p className="text-gray-700">Review Photo: <img src={encodeURI(review.review_photo)} alt="Review" /></p>
                            {/* <p className="text-gray-700">Approved: {review.approved ? "Yes" : "No"}</p> */}
                            <p className="text-gray-700">
                                Status:{" "}
                                {review.approved === 1
                                    ? "Approved ✅"
                                    : review.approved === 0
                                        ? "Pending ⏳"
                                        : "Rejected ❌"}
                            </p>

                            {review.approved === 0 && (
                                <>
                                    <button
                                        onClick={() => handleApproveReview(review.id)}
                                        className="bg-green-500 text-white px-4 py-2 rounded-lg mt-4 w-full"
                                    >
                                        Approve Review
                                    </button>
                                    <button
                                        onClick={() => handleRejectReview(review.id)}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg mt-2 w-full"
                                    >
                                        Reject Review
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default CustomerReviewApproval
