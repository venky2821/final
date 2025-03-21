import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Star, Upload, LogOut } from 'lucide-react';

const CustomerPage: React.FC = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState<{ [key: number]: { product: any, quantity: number } }>({});
    // const [reviews, setReviews] = useState<{ [key: number]: string }>({});
    // const [ratings, setRatings] = useState<{ [key: number]: number }>({});
    const [reviews, setReviews] = useState<any[]>([]);
    const [rating, setRating] = useState(1);
    const [reviewText, setReviewText] = useState("");
    const [reviewPhoto, setReviewPhoto] = useState<File | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [loginActivity, setLoginActivity] = useState([]);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [category, setCategory] = useState("");
    const [photos, setPhotos] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [reservedOrders, setReservedOrders] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, loginRes, photosRes, reviewsRes, ordersRes] = await Promise.all([
                    fetch('http://localhost:8000/products').then(res => res.json()),
                    fetch('http://localhost:8000/login-activity', {
                        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                    }).then(res => res.json()),
                    fetch('http://localhost:8000/photos').then(res => res.json()),
                    fetch('http://localhost:8000/reviews').then(res => res.json()),
                    fetch('http://localhost:8000/orders/customer', {
                        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                    }).then(res => res.json())
                ]);
                setProducts(productsRes);
                setLoginActivity(loginRes);
                setPhotos(photosRes);
                setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
                setReservedOrders(ordersRes);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:8000/photos/categories');
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        fetchCategories();
    }, []);

    const handleLogout = () => navigate("/");

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewText && !reviewPhoto) return alert("Please provide a review text or upload a photo.");

        const formData = new FormData();
        formData.append("rating", rating.toString());
        formData.append("review_text", reviewText);
        if (reviewPhoto) formData.append("review_photo", reviewPhoto);

        try {
            const response = await fetch("http://localhost:8000/reviews/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: formData
            });

            if (!response.ok) throw new Error("Failed to submit review");

            alert("Review submitted successfully!");
            setReviewText("");
            setReviewPhoto(null);
            setRating(1);
            setReviews(await (await fetch('http://localhost:8000/reviews')).json());
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review");
        }
    };

    const handleCheckout = async () => {
        try {
            const purchases = Object.values(cart).map(({ product, quantity }) => ({
                product_id: product.name,
                quantity
            }));

            const response = await fetch("http://localhost:8000/reserve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(purchases)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Reservation failed");
            }

            alert(result.message || "Reservation successful!");
            setCart({});
            setShowCart(false);

            const [ordersRes] = await Promise.all([
                fetch('http://localhost:8000/orders/customer', {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                }).then(res => res.json())
            ]);
            setReservedOrders(ordersRes);
        } catch (error) {
            console.error("Error during reservation:", error);
            alert(error.message || "Reservation failed");
        }
    };

    const handleAddToCart = (product) => {
        setCart(prevCart => {
            const updatedCart = { ...prevCart };
            if (updatedCart[product.id]) {
                updatedCart[product.id].quantity += 1;
            } else {
                updatedCart[product.id] = { product, quantity: 1 };
            }
            return updatedCart;
        });
    };

    const handleUpdateQuantity = (productId: number, newQuantity: number) => {
        setCart(prevCart => {
            const updatedCart = { ...prevCart };
            if (newQuantity > 0) {
                updatedCart[productId].quantity = newQuantity;
            } else {
                delete updatedCart[productId]; // Remove item if quantity is set to 0
            }
            return updatedCart;
        });
    };

    const handleRemoveFromCart = (productId: number) => {
        setCart(prevCart => {
            const updatedCart = { ...prevCart };
            delete updatedCart[productId];
            return updatedCart;
        });
    };


    const stripMetadata = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;

                img.onload = () => {
                    useEffect(() => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            return reject(new Error("Canvas is not supported"));
                    }

                    // Set canvas size to match image
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw image onto canvas (this removes metadata)
                    ctx.drawImage(img, 0, 0);

                    // Convert to a new Blob without metadata
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            return reject(new Error("Failed to create stripped file"));
                        }

                        const strippedFile = new File([blob], file.name, { type: file.type });
                        resolve(strippedFile);
                    }, file.type);
                }, []);
                };

                img.onerror = () => reject(new Error("Failed to load image"));
            };

            reader.onerror = () => reject(new Error("Error reading file"));
        });
    };

    const handlePhotoUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!photoFile) return;
        const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validFormats.includes(photoFile.type)) {
            alert("Only JPEG, PNG, and GIF formats are allowed.");
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (photoFile.size > maxSize) {
            alert("File size must be less than 5MB.");
            return;
        }

        const strippedFile = await stripMetadata(photoFile);

        const formData = new FormData();
        formData.append('uploaded_file', strippedFile);
        formData.append('category', category);
        try {
            const response = await fetch('http://localhost:8000/photos/upload', {
                method: 'POST',
                body: formData,
                headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
            });
            if (response.ok) {
                alert('Photo uploaded successfully!');
                setPhotoFile(null);
                setCategory("");
                setPhotos(await (await fetch('http://localhost:8000/photos')).json());
            } else {
                alert('Failed to upload photo.');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
        }
    };

    const filteredPhotos = photos.filter(photo =>
        !selectedCategory || photo.category === selectedCategory
    );

    const handleCancelOrder = async (orderId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/orders/${orderId}/cancel`, {
                method: "PUT",
                headers: { "Content-Type": "application/json",
                    'Authorization': `Bearer ${localStorage.getItem("token")}` 
                 }
            });

            if (response.ok) {
                alert("Order canceled successfully!");
                setReservedOrders(reservedOrders.map(order =>
                    order.id === orderId ? { ...order, status: "cancelled" } : order
                ));
            } else {
                const data = await response.json();
                alert(`Error: ${data.detail}`);
            }
        } catch (error) {
            console.error("Error canceling order:", error);
        }
    };

    const handleReorder = async (orderId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/orders/${orderId}/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json",
                    'Authorization': `Bearer ${localStorage.getItem("token")}` 
                 },
            });

            if (response.ok) {
                const data = await response.json();
                alert("Order reordered successfully!");
                fetchOrders(); // Refresh order list
            } else {
                const data = await response.json();
                alert(`Error: ${data.detail}`);
            }
        } catch (error) {
            console.error("Error reordering:", error);
        }
    };


    return (
        <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
            <nav className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex justify-between items-center shadow-lg rounded-lg">
                <h1 className="text-3xl font-bold">Customer Portal</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowCart(true)} className="relative">
                        <ShoppingCart className="w-8 h-8 text-white" />
                        {Object.keys(cart).length > 0 && (
                            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{Object.keys(cart).length}</span>
                        )}
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg shadow-md">
                        <LogOut /> Logout
                    </button>
                </div>
            </nav>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="md:col-span-2">
                    <h1 className="text-3xl font-bold text-center text-gray-800">Our Products</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {products.map(product => (
                            <div key={product.id} className="bg-white shadow-md rounded-lg p-6 hover:scale-105 transition-transform">
                                <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                                <h2 className="text-2xl font-semibold text-gray-800">{product.name}</h2>
                                <p className="text-gray-600 mt-2">{product.description}</p>
                                <p className="font-bold text-lg text-blue-700 mt-2">Price: ${product.price}</p>
                                {/* <div className="mt-4">
                                    <h3 className="text-lg font-bold">Leave a Review</h3>
                                    <select
                                        value={ratings[product.id] || 1}
                                        onChange={(e) => setRatings(prev => ({ ...prev, [product.id]: Number(e.target.value) }))}
                                        className="border p-2 rounded w-full"
                                    >
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <option key={star} value={star}>{star} Star{star > 1 && 's'}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        value={reviews[product.id] || ""}
                                        onChange={(e) => setReviews(prev => ({ ...prev, [product.id]: e.target.value }))}
                                        className="border p-2 rounded w-full mt-2"
                                        placeholder="Write your review here..."
                                    />
                                    <button
                                        onClick={() => handleReviewSubmit(product.id)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-2 w-full"
                                    >
                                        Submit Review
                                    </button>
                                </div> */}
                                <button onClick={() => handleAddToCart(product)} className="bg-green-500 text-white px-4 py-2 rounded-lg mt-4 shadow-md w-full">Add to Cart</button>
                            </div>
                        ))}
                    </div>
                    {showCart && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                            <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="absolute top-2 right-2 text-gray-600 hover:text-black"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <h2 className="text-xl font-bold">Your Cart</h2>
                                {Object.keys(cart).length > 0 ? (
                                    <ul>
                                        {Object.entries(cart).map(([productId, { product, quantity }]) => (
                                            <li key={product.id} className="border-b py-2 flex justify-between items-center">
                                                <div>
                                                    {product.name} - ${product.price} x
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={quantity}
                                                        onChange={(e) => handleUpdateQuantity(product.id, Number(e.target.value))}
                                                        className="border mx-2 w-12 text-center"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFromCart(product.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>Your cart is empty.</p>
                                )}
                                <button
                                    onClick={handleCheckout}
                                    className={`bg-blue-500 text-white px-4 py-2 rounded-lg mt-4 w-full ${Object.keys(cart).length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={Object.keys(cart).length === 0}
                                >
                                    Reserve
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* <div>
                    <h2 className="text-xl font-bold bg-white p-4 rounded-lg shadow-md">Recent Login Activity</h2>
                    <ul className="bg-white p-4 mt-4 rounded-lg shadow-md">
                        {loginActivity.map(activity => (
                            <li key={activity.id} className="border-b py-2">{activity.timestamp} - {activity.username}</li>
                        ))}
                    </ul>
                </div> */}
            </div>

            <div className="mt-10">
                <h1 className="text-3xl font-bold text-center text-gray-800">Upload a Photo</h1>
                <form onSubmit={handlePhotoUpload} className="flex flex-col items-center gap-4 mt-4">
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files![0])} required className="border p-2 rounded" />
                    <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required className="border p-2 rounded" />
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Upload /> Upload Photo
                    </button>
                </form>
            </div>

            <h2 className="text-3xl font-bold mt-6 text-center text-gray-800">Photo Gallery</h2>
            <select onChange={(e) => setSelectedCategory(e.target.value)} className="mt-4">
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                ))}
            </select>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                {filteredPhotos.map(photo => (
                    <div key={photo.id} className="bg-white shadow-md rounded-lg p-4">
                        <img src={photo.url} alt="Uploaded" className="w-full h-48 object-cover rounded-lg mb-2" />
                        <p className="text-gray-600">Category: {photo.category}</p>
                    </div>
                ))}
            </div>

            <div className="mt-10">
                <h1 className="text-3xl font-bold text-center text-gray-800">Customer Reviews</h1>

                <div className="mt-6 bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Submit a Review</h2>
                    <form onSubmit={handleReviewSubmit} className="flex flex-col items-center gap-4 mt-4">
                        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border p-2 rounded w-full">
                            {[1, 2, 3, 4, 5].map(star => (
                                <option key={star} value={star}>{star} Star{star > 1 && 's'}</option>
                            ))}
                        </select>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            className="border p-2 rounded w-full"
                            placeholder="Write your review here..."
                        />
                        <input type="file" accept="image/*" onChange={(e) => setReviewPhoto(e.target.files![0])} className="border p-2 rounded" />
                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <Upload /> Submit Review
                        </button>
                    </form>
                </div>

                {/* Reviews */}
                <div className="mt-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Reviews</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {reviews.map(review => (
                            <div key={review.id} className="bg-white shadow-md rounded-lg p-6">
                                <p className="text-gray-600">{review.review_text}</p>
                                <p className="font-bold">Rating: {review.rating} ⭐</p>
                                {review.review_photo && <img src={review.review_photo} alt="Review" className="w-full h-48 object-cover rounded-lg mt-2" />}

                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* New Order History Section */}
            <div className="mt-10 bg-white shadow-md rounded-lg p-6">
                <h1 className="text-3xl font-bold text-center text-gray-800">Order History</h1>
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
                                {/* Show Cancel button for Reserved orders */}
                                {order.status === "reserved" && (
                                    <button
                                        onClick={() => handleCancelOrder(order.id)}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg mt-4 w-full"
                                    >
                                        Cancel Order
                                    </button>
                                )}

                                {/* Show Reorder button for Completed orders */}
                                {order.status === "completed" && (
                                    <button
                                        onClick={() => handleReorder(order.id)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-4 w-full"
                                    >
                                        Reorder
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerPage;