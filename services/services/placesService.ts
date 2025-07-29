import { Restaurant } from '../types';

declare const google: any;

function getPlaceDetails(service: any, place_id: string): Promise<Restaurant> {
    return new Promise((resolve, reject) => {
        const detailsRequest = {
            placeId: place_id,
            fields: ['place_id', 'name', 'vicinity', 'website', 'photos', 'rating', 'user_ratings_total', 'opening_hours']
        };

        service.getDetails(detailsRequest, (place: any, status: any) => {
            if (status === 'OK' && place) {
                let photoUrl: string | undefined = undefined;
                if (place.photos && place.photos.length > 0) {
                    photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 400 });
                }
                
                const isOpen = place.opening_hours?.isOpen?.();

                const restaurant: Restaurant = {
                    place_id: place.place_id,
                    name: place.name,
                    vicinity: place.vicinity,
                    website: place.website,
                    photoUrl,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    isOpen: !!isOpen,
                    opening_hours: place.opening_hours,
                };
                resolve(restaurant);
            } else {
                reject(new Error(`Place details request failed for placeId ${place_id} with status: ${status}`));
            }
        });
    });
}

export async function findNearbyRestaurants(lat: number, lng: number): Promise<Restaurant[]> {
    // This function now relies on the Google Maps script having already been loaded by App.tsx
    if (typeof google === 'undefined' || typeof google.maps?.importLibrary !== 'function') {
        throw new Error("Could not connect to Google Places service. The Google Maps API may not be loaded correctly.");
    }

    const { PlacesService } = await google.maps.importLibrary('places') as any;
    const { LatLng } = await google.maps.importLibrary('core') as any;

    const pyrmont = new LatLng(lat, lng);
    const mapElement = document.createElement('div');
    const service = new PlacesService(mapElement);
    
    const request = {
        location: pyrmont,
        radius: 1500, // search within 1.5km
        type: 'restaurant'
    };

    return new Promise((resolve, reject) => {
         service.nearbySearch(request, (results: any[] | null, status: any) => {
            if (status === 'OK' && results) {
                const detailPromises = results
                    .slice(0, 12) // Limit to 12 results to avoid excessive API calls
                    .map(place => place.place_id)
                    .filter(id => !!id)
                    .map(id => getPlaceDetails(service, id!));

                Promise.all(detailPromises)
                    .then(restaurantsWithDetails => {
                        resolve(restaurantsWithDetails);
                    })
                    .catch(error => {
                        reject(error);
                    });
            } else if (status === 'ZERO_RESULTS') {
                resolve([]);
            } else {
                 let errorMessage = `Places API search failed with status: ${status}`;
                 if (status === 'REQUEST_DENIED') {
                    errorMessage = 'Could not access Google Places service. The provided API key may be invalid or has restrictions.';
                }
                reject(new Error(errorMessage));
            }
        });
    });
}
