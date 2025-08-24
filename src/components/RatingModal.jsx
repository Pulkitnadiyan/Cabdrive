import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

const RatingModal = ({ rideId, driverName, onSubmit, onSkip }) => {
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [hoverRating, setHoverRating] = useState(0);

    const handleSubmit = () => {
        if (rating > 0) {
            onSubmit(rideId, { rating, review });
        } else {
            onSkip();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm w-full relative text-center">
                <button onClick={onSkip} className="absolute top-4 right-4 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X size={20} />
                </button>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Rate Your Ride</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">How was your ride with {driverName}?</p>

                {/* Star Rating */}
                <div className="flex justify-center items-center mb-6 space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`cursor-pointer h-10 w-10 transition-colors ${
                                (hoverRating || rating) >= star 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                        />
                    ))}
                </div>

                {/* Review Textarea */}
                <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Leave a review (optional)..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />

                {/* Action Buttons */}
                <div className="mt-6">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Submit Feedback
                    </button>
                    <button
                        onClick={onSkip}
                        className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RatingModal;
