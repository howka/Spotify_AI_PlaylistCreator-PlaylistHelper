const BACKEND_URL = "http://127.0.0.1:8000";

export async function checkBackend() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        const data = await response.json();
        console.log("Python backend:", data.message);
        return data;

    } catch (error) {
        console.error("Cannot connect to Python backend:", error);
        throw error;
    }
}
export async function sortPlaylist(songs, method) {
    const response = await fetch(
        "http://127.0.0.1:8000/api/sort",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                songs,
                method
            })
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        throw new Error(
            typeof error.detail === "string"
                ? error.detail
                : `Sorting failed: ${response.status}`
        );
    }

    return await response.json();
}