// =====================================
// SPOTIFY CONFIGURATION
// =====================================
import { checkBackend } from "./backendApi.js";
import { loadPlaylists, clearPlaylists } from "./playlists.js";
const clientId = "2fcf61f304a94287b7ee3147951a0c88"; //Take this out when Publishing

const redirectUri = "http://127.0.0.1:5500/";

const scopes = [
    "playlist-read-private",
    "playlist-read-collaborative"
];

// =====================================
// HTML ELEMENTS
// =====================================

const loginButton = document.getElementById("spotifyLogin");
const logoutButton = document.getElementById("spotifyLogout");
const spotifyStatus = document.getElementById("spotifyStatus");

// =====================================
// SESSION STORAGE
// =====================================

const storage = sessionStorage;

function clearTokens() {
    storage.removeItem("spotify_access_token");
    storage.removeItem("spotify_refresh_token");
    storage.removeItem("spotify_expires_at");
}

function saveTokens(data) {
    storage.setItem("spotify_access_token", data.access_token);

    if (data.refresh_token) {
        storage.setItem("spotify_refresh_token", data.refresh_token);
    }

    const expiresAt = Date.now() + data.expires_in * 1000;

    storage.setItem("spotify_expires_at", expiresAt);
}

// =====================================
// GENERATE RANDOM STRING
// =====================================

function generateRandomString(length) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    const values = crypto.getRandomValues(new Uint8Array(length));

    return Array.from(
        values,
        value => characters[value % characters.length]
    ).join("");
}

// =====================================
// GENERATE CODE CHALLENGE
// =====================================

async function generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);

    const digest = await crypto.subtle.digest("SHA-256", data);

    return btoa(
        String.fromCharCode(...new Uint8Array(digest))
    )
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

// =====================================
// ERROR HANDLING AND RATE LIMITING
// =====================================

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function requestToken(body) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const response = await fetch(
            "https://accounts.spotify.com/api/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams(body)
            }
        );

        if (response.status === 429 || response.status >= 500) {
            if (attempt === 3) {
                throw new Error(`Spotify server error: ${response.status}`);
            }

            const retryAfter = response.headers.get("Retry-After");

            let delay = 1000 * Math.pow(2, attempt);

            if (response.status === 429 && retryAfter) {
                const seconds = Number(retryAfter);

                if (Number.isFinite(seconds)) {
                    delay = Math.max(0, seconds * 1000);
                } else {
                    const retryDate = Date.parse(retryAfter);

                    if (!Number.isNaN(retryDate)) {
                        delay = Math.max(0, retryDate - Date.now());
                    }
                }
            }

            await sleep(delay);
            continue;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error_description ||
                data.error?.message ||
                data.error ||
                `HTTP error ${response.status}`
            );
        }

        return data;
    }
}

// =====================================
// LOGIN
// =====================================

async function loginWithSpotify() {
    if (clientId === "YOUR_CLIENT_ID") {
        spotifyStatus.textContent = "Please configure your Spotify Client ID.";
        return;
    }

    const verifier = generateRandomString(64);

    const challenge = await generateCodeChallenge(verifier);

    const state = generateRandomString(32);

    storage.setItem("spotify_verifier", verifier);
    storage.setItem("spotify_state", state);

    const authUrl = new URL("https://accounts.spotify.com/authorize");

    authUrl.search = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        code_challenge_method: "S256",
        code_challenge: challenge,
        state: state,
        scope: scopes.join(" ")
    }).toString();

    window.location.assign(authUrl.toString());
}

// =====================================
// HANDLE REDIRECT
// =====================================

async function handleSpotifyRedirect() {
    const params = new URLSearchParams(window.location.search);

    const code = params.get("code");
    const error = params.get("error");
    const returnedState = params.get("state");

    if (!code && !error) {
        return;
    }

    // Remove authorization data from the address bar.
    window.history.replaceState({}, "", window.location.pathname);

    const expectedState = storage.getItem("spotify_state");
    const verifier = storage.getItem("spotify_verifier");

    storage.removeItem("spotify_state");
    storage.removeItem("spotify_verifier");

    if (!expectedState || returnedState !== expectedState) {
        throw new Error("Spotify authorization state mismatch.");
    }

    if (error) {
        throw new Error(`Spotify authorization failed: ${error}`);
    }

    if (!verifier) {
        throw new Error("Missing PKCE verifier. Please sign in again.");
    }

    const data = await requestToken({
        client_id: clientId,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        code_verifier: verifier
    });

    saveTokens(data);
}

// =====================================
// REFRESH ACCESS TOKEN
// =====================================

let refreshPromise = null;

async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = storage.getItem("spotify_refresh_token");

        if (!refreshToken) {
            clearTokens();
            throw new Error("Your session expired. Please connect again.");
        }

        try {
            const data = await requestToken({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: clientId
            });

            saveTokens(data);

            return data.access_token;
        } catch (error) {
            if (
                error.message.includes("invalid_grant") ||
                error.message.includes("invalid_client")
            ) {
                clearTokens();
                throw new Error(
                    "Spotify authorization expired. Please connect again."
                );
            }

            throw error;
        }
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

// =====================================
// GET VALID ACCESS TOKEN
// =====================================

export async function getAccessToken() {
    const token = storage.getItem("spotify_access_token");

    const expiresAt = Number(
        storage.getItem("spotify_expires_at")
    );

    if (token && Date.now() < expiresAt - 60000) {
        return token;
    }

    if (storage.getItem("spotify_refresh_token")) {
        return await refreshAccessToken();
    }

    return null;
}

// =====================================
// UPDATE UI
// =====================================

function updateUI(connected) {
    loginButton.hidden = connected;
    logoutButton.hidden = !connected;

    spotifyStatus.textContent = connected
        ? "Connected to Spotify!"
        : "Not connected to Spotify";
}

// =====================================
// LOGOUT
// =====================================

function logoutSpotify() {
    clearTokens();
    clearPlaylists();
    updateUI(false);
}

// =====================================
// INITIALIZE
// =====================================

async function initializeSpotify() {
    loginButton.addEventListener("click", loginWithSpotify);
    logoutButton.addEventListener("click", logoutSpotify);

    try {
        await handleSpotifyRedirect();

        const token = await getAccessToken();

        updateUI(Boolean(token));

        if (token) {
            await loadPlaylists();
        }

    } catch (error) {
        console.error("Spotify authentication:", error);

        spotifyStatus.textContent = error.message;

        loginButton.hidden = false;
        logoutButton.hidden = true;
    }
}

initializeSpotify();
checkBackend().catch(() => {
    console.log("Python backend is currently unavailable.");
});