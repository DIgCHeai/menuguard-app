// This is a Netlify Function that acts as a secure endpoint
// to provide the client-side application with necessary, public-facing API keys.
// It reads from server-side environment variables, ensuring secrets are never
// exposed in the git repository or directly in the client-side code.

// Netlify's build process will automatically handle bundling this function,
// so we don't need any special configuration here.

export default async () => {
    // Check that all required environment variables are set in the Netlify UI.
    if (!process.env.GOOGLE_MAPS_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return new Response(
            JSON.stringify({
                error: 'Required environment variables (Google Maps, Supabase) are not set on the server.'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
    
    // Create a configuration object with the public keys.
    const config = {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    };
    
    // Return the configuration as a JSON response.
    return new Response(
        JSON.stringify(config),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
};
