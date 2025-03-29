import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Star, Upload, LogOut, Package, Image, MessageSquare, History, Home } from 'lucide-react';

// Types
interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category: string;
    stock: number;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface Review {
    id: number;
    rating: number;
    review_text: string;
    review_photo?: string;
    created_at: string;
    user_name: string;
}

interface Order {
    id: number;
    customer_name: string;
    total_price: number;
    status: 'reserved' | 'completed' | 'cancelled';
    items: Array<{
        id: number;
        product_name: string;
        quantity: number;
    }>;
    created_at: string;
}

interface Photo {
    id: number;
    url: string;
    category: string;
}

const CustomerPage: React.FC = () => {
    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<{ [key: number]: CartItem }>({});
    const [reviews, setReviews] = useState<Review[]>([]);
    const [rating, setRating] = useState(1);
    const [reviewText, setReviewText] = useState("");
    const [reviewPhoto, setReviewPhoto] = useState<File | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [category, setCategory] = useState("");
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [reservedOrders, setReservedOrders] = useState<Order[]>([]);
    const [activeSection, setActiveSection] = useState('products');
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

    const renderContent = () => {
        switch (activeSection) {
            case 'products':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">Our Products</h1>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowCart(true)} className="relative">
                                    <ShoppingCart className="w-6 h-6 text-gray-600" />
                                    {Object.keys(cart).length > 0 && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            {Object.keys(cart).length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map(product => (
                                <div key={product.id} className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow">
                                    <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                                    <h2 className="text-xl font-semibold text-gray-800">{product.name}</h2>
                                    <p className="text-gray-600 mt-2">{product.description}</p>
                                    <div className="flex justify-between items-center mt-4">
                                        <p className="font-bold text-lg text-blue-700">${product.price}</p>
                                        <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleAddToCart(product)} 
                                        className="bg-green-500 text-white px-4 py-2 rounded-lg mt-4 shadow-md w-full hover:bg-green-600 transition-colors"
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'photos':
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold text-gray-800">Photo Gallery</h1>
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload a Photo</h2>
                            <form onSubmit={handlePhotoUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Photo</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => setPhotoFile(e.target.files![0])} 
                                        required 
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter category" 
                                        value={category} 
                                        onChange={(e) => setCategory(e.target.value)} 
                                        required 
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
                                >
                                    <Upload className="w-5 h-5" /> Upload Photo
                                </button>
                            </form>
                        </div>
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Gallery</h2>
                                <select 
                                    value={selectedCategory} 
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="border rounded-lg px-3 py-1"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((category, index) => (
                                        <option key={index} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPhotos.map(photo => (
                                    <div key={photo.id} className="bg-gray-50 rounded-lg overflow-hidden">
                                        <img src={photo.url} alt="Uploaded" className="w-full h-48 object-cover" />
                                        <div className="p-3">
                                            <p className="text-sm text-gray-600">Category: {photo.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'reviews':
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold text-gray-800">Customer Reviews</h1>
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Submit a Review</h2>
                            <form onSubmit={handleReviewSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className="focus:outline-none"
                                            >
                                                <Star className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Text</label>
                                    <textarea
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        className="w-full border rounded-lg p-2"
                                        placeholder="Write your review here..."
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo (Optional)</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => setReviewPhoto(e.target.files![0])} 
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
                                >
                                    <Upload className="w-5 h-5" /> Submit Review
                                </button>
                            </form>
                        </div>
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Reviews</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {reviews.map(review => (
                                    <div key={review.id} className="border rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-gray-600">{review.review_text}</p>
                                        {review.review_photo && (
                                            <img
                                                src={review.review_photo}
                                                alt="Review"
                                                className="w-full h-48 object-cover rounded-lg mt-4"
                                            />
                                        )}
                                        <p className="text-sm text-gray-500 mt-2">
                                            By {review.user_name} on {new Date(review.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'orders':
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold text-gray-800">Order History</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reservedOrders.length === 0 ? (
                                <p className="text-gray-600 text-center col-span-full">No orders found.</p>
                            ) : (
                                reservedOrders.map(order => (
                                    <div key={order.id} className="bg-white shadow-md rounded-lg p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl font-semibold">Order #{order.id}</h2>
                                            <span className={`px-2 py-1 rounded text-sm ${
                                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-gray-700">Total: ${order.total_price}</p>
                                        {/* <p className="text-gray-700">Date: {new Date(order.created_at).toLocaleDateString()}</p> */}
                                        <ul className="mt-4 space-y-2">
                                            {order.items.map(item => (
                                                <li key={item.id} className="text-gray-600 flex items-center gap-2">
                                                    <Package className="w-4 h-4" />
                                                    {item.product_name} - {item.quantity} pcs
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 flex gap-2">
                                            {order.status === "reserved" && (
                                                <button
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="bg-red-500 text-white px-4 py-2 rounded-lg w-full hover:bg-red-600 transition-colors"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                            {order.status === "completed" && (
                                                <button
                                                    onClick={() => handleReorder(order.id)}
                                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full hover:bg-blue-600 transition-colors"
                                                >
                                                    Reorder
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Top Navigation */}
            <nav className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Customer Portal</h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg shadow-md">
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="container mx-auto p-6">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-md p-4 space-y-2">
                            <button
                                onClick={() => setActiveSection('products')}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                    activeSection === 'products' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Home className="w-5 h-5" />
                                Products
                            </button>
                            <button
                                onClick={() => setActiveSection('photos')}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                    activeSection === 'photos' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Image className="w-5 h-5" />
                                Photos
                            </button>
                            <button
                                onClick={() => setActiveSection('reviews')}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                    activeSection === 'reviews' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <MessageSquare className="w-5 h-5" />
                                Reviews
                            </button>
                            <button
                                onClick={() => setActiveSection('orders')}
                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                    activeSection === 'orders' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <History className="w-5 h-5" />
                                Orders
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
                        <button
                            onClick={() => setShowCart(false)}
                            className="absolute top-2 right-2 text-gray-600 hover:text-black"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Your Cart</h2>
                        {Object.keys(cart).length > 0 ? (
                            <>
                                <ul className="space-y-2">
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
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-lg font-bold">
                                        Total: ${Object.values(cart).reduce((sum, { product, quantity }) => sum + product.price * quantity, 0)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-4 w-full hover:bg-blue-600 transition-colors"
                                >
                                    Checkout
                                </button>
                            </>
                        ) : (
                            <p className="text-gray-500">Your cart is empty.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage;