import { getAccessToken } from "./spotifyAuth.js";

const playlistContainer = document.getElementById("savedPlaylists");
const playlistTemplate = document.getElementById("playlistTemplate");

let selectedPlaylist = null;

// Fetch all playlists
export async function loadPlaylists() {
    playlistContainer.textContent = "Loading playlists...";

    try {
        const token = await getAccessToken();

        if (!token) {
            throw new Error("Please connect your Spotify account.");
        }

        let url = "https://api.spotify.com/v1/me/playlists?limit=50";

        const playlists = [];

        while (url) {
            const response = await spotifyRequest(url, token);

            const data = await response.json();

            playlists.push(...data.items.filter(Boolean));

            url = data.next;
        }

        displayPlaylists(playlists);

    } catch (error) {
        console.error("Error loading playlists:", error);
        playlistContainer.textContent = error.message;
    }
}

// Request data with error handling and bounded retries
async function spotifyRequest(url, token) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.ok) {
            return response;
        }

        if (response.status === 429) {
            const errorBody = await response.clone().json().catch(() => ({}));

            if (errorBody.error?.reason === "QUOTA_EXCEEDED") {
                throw new Error("Spotify's application quota has been exceeded.");
            }
        }

        if (
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503
        ) {
            if (attempt < 3) {
                const retryAfter = response.headers.get("Retry-After");

                let delay = 1000 * (2 ** attempt);

                if (response.status === 429 && retryAfter) {
                    const seconds = Number(retryAfter);

                    if (Number.isFinite(seconds)) {
                        delay = Math.max(delay, seconds * 1000);
                    } else {
                        const date = Date.parse(retryAfter);

                        if (!Number.isNaN(date)) {
                            delay = Math.max(delay, date - Date.now());
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
        }

        const data = await response.json().catch(() => ({}));

        const message =
            data.error?.message ||
            data.error_description ||
            `Spotify returned HTTP ${response.status}`;

        if (response.status === 401) throw new Error("Spotify authentication failed. Please reconnect.");
        

        if (response.status === 403)  throw new Error(`Spotify denied access: ${message}`);
        

        throw new Error(message);
    }
}

// Display the playlists
function displayPlaylists(playlists) {
    playlistContainer.replaceChildren();

    if (playlists.length === 0) {
        playlistContainer.textContent = "No playlists found.";
        return;
    }

    playlists.forEach(playlist => {
        createPlaylistCard(playlist);
    });
}

// Create a card using the HTML template
function createPlaylistCard(playlist) {
    const clone = playlistTemplate.content.cloneNode(true);

    const image = clone.querySelector(".playlistImage");
    const name = clone.querySelector(".playlistName");
    const tracks = clone.querySelector(".playlistTracks");
    const button = clone.querySelector(".selectPlaylist");

    // Playlist information
    name.textContent = playlist.name;

    tracks.textContent = playlist.items
        ? `${playlist.items.total} items`
        : "Item count unavailable";

    // Playlist image
    if (playlist.images && playlist.images.length > 0) {
        image.src = playlist.images[0].url;
        image.alt = `${playlist.name} cover`;
    } else {
        image.hidden = true;
    }

    // Select playlist
    button.addEventListener("click", async () => {
        selectedPlaylist = playlist;
        // Notify other JavaScript files that a playlist was selected
        window.dispatchEvent(
            new CustomEvent("playlistSelected", {
                detail: {
                    id: playlist.id,
                    name: playlist.name
                }
            })
        );
        const currentSelection = ++selectionVersion;

        // Highlight the selected playlist
        document.querySelectorAll(".playlistCard").forEach(card => {
            card.classList.remove("selected");
        });

        const card = button.closest(".playlistCard");
        card.classList.add("selected");


        // Show selected playlist section
        selectedPlaylistSection.hidden = false;
        selectedPlaylistName.textContent = playlist.name;
        selectedPlaylistCount.textContent = "Loading songs...";
        playlistSongs.replaceChildren();


        try {
            const songs = await getPlaylistSongs(playlist.id);
            // Ignore older requests if another playlist was selected
            if (currentSelection !== selectionVersion) {
                return;
            }

            displaySongs(songs);

            console.log("Selected playlist:", playlist.name);
            console.log("Songs:", songs);

        } catch (error) {

            if (currentSelection !== selectionVersion) {
                return;
            }

            console.error("Error fetching songs:", error);
            selectedPlaylistCount.textContent = "Unable to load songs.";
            playlistSongs.textContent = error.message;

        }
    });

    // Add Spotify attribution/link
    if (playlist.external_urls?.spotify) {
        const link = document.createElement("a");

        link.href = playlist.external_urls.spotify;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open on Spotify";

        clone.querySelector(".playlistCard").appendChild(link);
    }
    playlistContainer.appendChild(clone);
}

export function clearPlaylists() {
    selectedPlaylist = null;
    selectionVersion++;
    playlistContainer.textContent = "Connect your Spotify account to see your playlists.";
    playlistSongs.replaceChildren();
    window.dispatchEvent(new Event("playlistDisconnected"));
    selectedPlaylistName.textContent = "";
    selectedPlaylistCount.textContent = "";
    selectedPlaylistSection.hidden = true;

}
// =====================================
// SELECTED PLAYLIST ELEMENTS
// =====================================

const selectedPlaylistSection = document.getElementById("selectedPlaylistSection");
const selectedPlaylistName = document.getElementById("selectedPlaylistName");
const selectedPlaylistCount = document.getElementById("selectedPlaylistCount");
const playlistSongs = document.getElementById("playlistSongs");
const songTemplate = document.getElementById("songTemplate");
let selectionVersion = 0;


// =====================================
// FETCH PLAYLIST SONGS
// =====================================

async function getPlaylistSongs(playlistId) {

    const songs = [];

    let url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50`;

    while (url) {

        const token = await getAccessToken();
        if (!token) {
            throw new Error("Your Spotify session expired. Please reconnect.");
        }
        const response = await spotifyRequest(url, token);
        const data = await response.json();
        songs.push(...data.items);
        url = data.next;
    }
    return songs;
}
// =====================================
// DISPLAY SONGS
// =====================================

function displaySongs(songs) {
    playlistSongs.replaceChildren();
    selectedPlaylistCount.textContent = `${songs.length} items`;
    if (songs.length === 0) {
        playlistSongs.textContent = "This playlist is empty.";
        return;
    }
    songs.forEach(song => {
        const track = song.item;
        // Ignore missing items and non-music items
        if (!track || track.type !== "track") {
            return;
        }
        createSongCard(track);
    });
}
// =====================================
// CREATE SONG CARD
// =====================================

function createSongCard(track) {
    const clone = songTemplate.content.cloneNode(true);
    const image = clone.querySelector(".songImage");
    const name = clone.querySelector(".songName");
    const artist = clone.querySelector(".songArtist");
    const link = clone.querySelector(".songLink");

    // Song name
    name.textContent = track.name;

    // Artist names
    artist.textContent = track.artists
        .map(artist => artist.name)
        .join(", ");


    // Album image
    if (track.album?.images?.length > 0) {
        image.src = track.album.images[0].url;
        image.alt = `${track.album.name} album cover`;
    } else {
        image.hidden = true;
    }


    // Spotify link
    if (track.external_urls?.spotify) 
        {link.href = track.external_urls.spotify;} 
    else 
        {link.hidden = true;}

    // Add to website
    playlistSongs.appendChild(clone);

}