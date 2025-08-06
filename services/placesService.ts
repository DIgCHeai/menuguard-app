import { Restaurant } from '../types';

export async function findNearbyRestaurants(latitude: number, longitude: number): Promise<Restaurant[]> {
    const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'places',
            data: { latitude, longitude },
        }),
    });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.error || `Failed to find nearby restaurants. Status: ${response.status}`);
    }

    return body as Restaurant[];
}
