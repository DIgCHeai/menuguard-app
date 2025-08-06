import React from 'react';
import { Restaurant } from '../types';
import Spinner from './Spinner';
import { StarIcon } from './icons/StarIcon';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';

interface NearbyRestaurantsProps {
    isLoading: boolean;
    error: string | null;
    restaurants: Restaurant[] | null;
    onSelectRestaurant: (restaurant: Restaurant) => void;
}

const RestaurantCard: React.FC<{ restaurant: Restaurant, onSelect: () => void }> = ({ restaurant, onSelect }) => {
    // Use the modern, non-deprecated 'isOpen' property
    const isOpen = restaurant.isOpen;

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 flex flex-col">
            <div className="h-40 bg-gray-200 flex items-center justify-center">
                {restaurant.photoUrl ? (
                    <img src={restaurant.photoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                    <LocationMarkerIcon className="w-12 h-12 text-gray-400" />
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h4 className="font-bold text-lg text-gray-800 truncate">{restaurant.name}</h4>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                    {restaurant.rating && (
                        <>
                            <span className="font-bold text-yellow-500 mr-1">{restaurant.rating.toFixed(1)}</span>
                            <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
                            <span>({restaurant.user_ratings_total})</span>
                        </>
                    )}
                </div>
                <div className={`text-sm font-semibold mt-2 flex items-center ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full mr-2 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {isOpen ? 'Open now' : 'Closed'}
                </div>
                 <p className="text-sm text-gray-500 mt-2 flex-grow">{restaurant.vicinity}</p>
                <button
                    onClick={onSelect}
                    className="mt-4 w-full bg-green-600 text-white font-bold text-sm py-2 px-3 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Select
                </button>
            </div>
        </div>
    )
}

const NearbyRestaurants: React.FC<NearbyRestaurantsProps> = ({ isLoading, error, restaurants, onSelectRestaurant }) => {
    if (isLoading) {
        return (
            <div className="text-center p-8">
                <div className="flex justify-center items-center space-x-3">
                    <Spinner />
                    <p className="text-lg text-gray-600">Finding restaurants near you...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Location Error: </strong>
                <span>{error}</span>
            </div>
        );
    }

    if (!restaurants) {
        return null;
    }
    
    if(restaurants.length === 0) {
        return (
             <div className="text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <h3 className="text-lg font-medium text-gray-900">No Restaurants Found</h3>
                <p className="mt-1 text-sm text-gray-500">We couldn't find any restaurants within a 1.5km radius.</p>
            </div>
        )
    }

    return (
        <div className="mt-8">
            <h3 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-6">Nearby Restaurants</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map(restaurant => (
                    <RestaurantCard 
                        key={restaurant.place_id} 
                        restaurant={restaurant}
                        onSelect={() => onSelectRestaurant(restaurant)}
                    />
                ))}
            </div>
        </div>
    );
};

export default NearbyRestaurants;